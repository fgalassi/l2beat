import { EthereumAddress, ProjectId, UnixTime } from '@l2beat/shared'

import { ProjectDiscovery } from '../discovery/ProjectDiscovery'
import { formatSeconds } from '../utils/formatSeconds'
import {
  CONTRACTS,
  DATA_AVAILABILITY,
  EXITS,
  FORCE_TRANSACTIONS,
  FRONTRUNNING_RISK,
  makeBridgeCompatible,
  NUGGETS,
  RISK_VIEW,
  STATE_CORRECTNESS,
} from './common'
import { Layer2 } from './types'

const discovery = new ProjectDiscovery('polygonzkevm')
const delay = formatSeconds(
  discovery.getContractValue<number>('Timelock', 'getMinDelay'),
)
const trustedAggregatorTimeout = formatSeconds(
  discovery.getContractValue<number>(
    'PolygonZkEvm',
    'trustedAggregatorTimeout',
  ),
)
const pendingStateTimeout = formatSeconds(
  discovery.getContractValue<number>('PolygonZkEvm', 'pendingStateTimeout'),
)
const _HALT_AGGREGATION_TIMEOUT = formatSeconds(
  discovery.getContractValue<number>(
    'PolygonZkEvm',
    '_HALT_AGGREGATION_TIMEOUT',
  ),
)

export const polygonzkevm: Layer2 = {
  type: 'layer2',
  id: ProjectId('polygonzkevm'),
  display: {
    name: 'Polygon zkEVM',
    slug: 'polygonzkevm',
    warning: 'The forced transaction mechanism is currently disabled.',
    description:
      'Polygon zkEVM is aiming to become a decentralized Ethereum Layer 2 scalability solution that uses cryptographic zero-knowledge proofs to offer validity and finality of off-chain transactions. Polygon zkEVM wants to be equivalent with the Ethereum Virtual Machine.',
    purpose: 'Universal',
    links: {
      websites: ['https://polygon.technology/polygon-zkevm'],
      apps: ['https://bridge.zkevm-rpc.com'],
      documentation: [
        'https://wiki.polygon.technology/docs/zkEVM/introduction',
      ],
      explorers: ['https://zkevm.polygonscan.com/'],
      repositories: ['https://github.com/0xPolygonHermez'],
      socialMedia: [
        'https://twitter.com/0xPolygon',
        'https://discord.gg/XvpHAxZ',
        'https://polygon.technology/blog-tags/polygon-zk',
      ],
    },
    activityDataSource: 'Blockchain RPC',
  },
  config: {
    escrows: [
      discovery.getEscrowDetails({
        address: EthereumAddress('0x2a3DD3EB832aF982ec71669E178424b10Dca2EDe'),
        sinceTimestamp: new UnixTime(1679653127),
        tokens: '*',
      }),
    ],
    transactionApi: {
      type: 'rpc',
      startBlock: 1,
      url: 'https://polygon-rpc.com/zkevm',
      callsPerMinute: 500,
    },
  },
  riskView: makeBridgeCompatible({
    stateValidation: {
      ...RISK_VIEW.STATE_ZKP_SN,
      references: [
        'https://etherscan.io/address/0xe262Ea2782e2e8dbFe354048c3B5d6DE9603EfEF#code#F14#L817',
      ],
    },
    //include info that txs are posted, not state diffs
    dataAvailability: {
      ...RISK_VIEW.DATA_ON_CHAIN,
      description:
        RISK_VIEW.DATA_ON_CHAIN.description +
        ' Unlike most zk rollups transactions are posted instead of state diffs.',
      references: [
        'https://etherscan.io/address/0xe262Ea2782e2e8dbFe354048c3B5d6DE9603EfEF#code#F14#L186',
      ],
    },
    upgradeability: RISK_VIEW.UPGRADABLE_POLYGON_ZKEVM(delay),
    // this will change once the isForcedBatchDisallowed is set to false inside Polygon ZkEvm contract (if they either lower timeouts or increase the timelock delay)
    sequencerFailure: {
      ...RISK_VIEW.SEQUENCER_NO_MECHANISM,
      references: [
        'https://etherscan.io/address/0xe262Ea2782e2e8dbFe354048c3B5d6DE9603EfEF#code#F14#L243',
      ],
    },
    validatorFailure: {
      value: 'Submit proofs',
      description: `If the validator fails, users can leverage open source prover to submit proofs to the smart contract. There is a ${trustedAggregatorTimeout} delay for proving and a ${pendingStateTimeout} delay for finalizing state proven in this way. These delays can only be lowered except during the emergency state.`,
      references: [
        'https://etherscan.io/address/0xe262Ea2782e2e8dbFe354048c3B5d6DE9603EfEF#code#F14#L636',
        'https://etherscan.io/address/0xe262Ea2782e2e8dbFe354048c3B5d6DE9603EfEF#code#F14#L859',
      ],
    },
    destinationToken: RISK_VIEW.NATIVE_AND_CANONICAL(),
    validatedBy: RISK_VIEW.VALIDATED_BY_ETHEREUM,
  }),
  technology: {
    stateCorrectness: {
      ...STATE_CORRECTNESS.VALIDITY_PROOFS,
      references: [
        {
          text: 'PolygonZkEvm.sol#L817 - Etherscan source code, _verifyAndRewardBatches function',
          href: 'https://etherscan.io/address/0xe262Ea2782e2e8dbFe354048c3B5d6DE9603EfEF#code#F14#L817',
        },
      ],
    },
    dataAvailability: {
      ...DATA_AVAILABILITY.ON_CHAIN_CANONICAL,
      references: [
        {
          text: 'PolygonZkEvm.sol#L186 - Etherscan source code, sequencedBatches mapping',
          href: 'https://etherscan.io/address/0xe262Ea2782e2e8dbFe354048c3B5d6DE9603EfEF#code#F14#L186',
        },
      ],
    },
    operator: {
      name: 'The system has a centralized sequencer',
      description:
        'Only a trusted sequencer is allowed to submit transaction batches. A mechanism for users to submit their own batches is currently disabled.',
      risks: [
        FRONTRUNNING_RISK,
        {
          category: 'Funds can be frozen if',
          text: 'the sequencer refuses to include an exit transaction.',
          isCritical: true,
        },
      ],
      references: [
        {
          text: 'PolygonZkEvm.sol#L454 - Etherscan source code, onlyTrustedSequencer modifier',
          href: 'https://etherscan.io/address/0xe262Ea2782e2e8dbFe354048c3B5d6DE9603EfEF#code#F14#L454',
        },
      ],
    },
    forceTransactions: {
      ...FORCE_TRANSACTIONS.NO_MECHANISM,
      description:
        'The mechanism for allowing users to submit their own transactions is currently disabled.',
      references: [
        {
          text: 'PolygonZkEvm.sol#L468 - Etherscan source code, isForceBatchAllowed modifier',
          href: 'https://etherscan.io/address/0xe262Ea2782e2e8dbFe354048c3B5d6DE9603EfEF#code#F14#L468',
        },
      ],
    },
    exitMechanisms: [
      {
        ...EXITS.REGULAR('zk', 'merkle proof'),
        references: [
          {
            text: 'PolygonZkEvmBridge.sol#L311 - Etherscan source code, claimAsset function',
            href: 'https://etherscan.io/address/0x5ac4182A1dd41AeEf465E40B82fd326BF66AB82C#code#F19#L311',
          },
        ],
      },
    ],
    category: 'ZK Rollup',
  },
  permissions: [
    ...discovery.getMultisigPermission(
      'AdminMultisig',
      'Admin of the PolygonZkEvm rollup, can set core system parameters like timeouts, sequencer and aggregator as well as deactivate emergency state. They can also upgrade the PolygonZkEvm contracts, but are restricted by a 10d delay unless rollup is put in the Emergency State.',
    ),
    {
      name: 'Sequencer',
      accounts: [
        discovery.getPermissionedAccount('PolygonZkEvm', 'trustedSequencer'),
      ],
      description:
        'Its sole purpose and ability is to submit transaction batches. In case they are unavailable users cannot rely on the force batch mechanism because it is currently disabled.',
    },
    {
      name: 'Aggregator',
      accounts: [
        discovery.getPermissionedAccount('PolygonZkEvm', 'trustedAggregator'),
      ],
      description: `The trusted aggregator provides the PolygonZkEvm contract with zk proofs of the new system state. In case they are unavailable a mechanism for users to submit proofs on their own exists, but is behind a ${trustedAggregatorTimeout} delay for proving and a ${pendingStateTimeout} delay for finalizing state proven in this way. These delays can only be lowered except during the emergency state.`,
    },
    ...discovery.getMultisigPermission(
      'OwnerMultisig',
      'The OwnerMultisig (Security Council) is a multisig that can be used to trigger the emergency state which pauses bridge functionality, restricts advancing system state and removes the upgradeability delay.',
    ),
  ],
  contracts: {
    addresses: [
      discovery.getContractDetails(
        'PolygonZkEvm',
        `The main contract of the Polygon zkEVM rollup. It defines the rules of the system including core system parameters, permissioned actors as well as emergency procedures. The emergency state can be activated either by the Security Council, by proving a soundness error or by presenting a sequenced batch that has not been aggregated before a ${_HALT_AGGREGATION_TIMEOUT} timeout. This contract receives transaction batches, L2 state roots as well as zk proofs.`,
      ),
      discovery.getContractDetails(
        'Bridge',
        'The escrow contract for user funds. It is mirrored on the L2 side and can be used to transfer both ERC20 assets and arbitrary messages. To transfer funds a user initiated transaction on both sides is required.',
      ),
      discovery.getContractDetails(
        'GlobalExitRoot',
        'Synchronizes deposit and withdraw merkle trees across L1 and L2. The global root from this contract is injected into the L2 contract.',
      ),
      discovery.getContractDetails(
        'FflonkVerifier',
        'An autogenerated contract that verifies zk proofs in the PolygonZkEvm system.',
      ),
    ],
    references: [
      {
        // TODO: do we need to trust the Sequencer to perform injections?
        text: 'State injections - PolygonZkEvm L2 source code',
        href: 'https://github.com/0xPolygonHermez/zkevm-contracts/blob/b1cefea1431e59b2121e543b786b93af99e859f4/contracts/PolygonZkEVMGlobalExitRootL2.sol#L17',
      },
    ],
    risks: [CONTRACTS.UPGRADE_WITH_DELAY_RISK(delay)],
  },
  // TODO: new upgradeability section with ProxyAdmin and Timelock
  milestones: [
    {
      name: 'Polygon zkEVM Mainnet Beta is Live',
      link: 'https://polygon.technology/blog/polygon-zkevm-mainnet-beta-is-live?utm_source=twitter&utm_medium=social&utm_campaign=zkevm-launch&utm_term=mainnet-beta-live&utm_content=blog',
      date: '2023-03-27T00:00:00Z',
      description: 'Polygon zkEVM public beta launched.',
    },
  ],
  knowledgeNuggets: [
    {
      title: 'State diffs vs raw tx data',
      url: 'https://twitter.com/krzKaczor/status/1641505354600046594',
      thumbnail: NUGGETS.THUMBNAILS.L2BEAT_03,
    },
  ],
}
