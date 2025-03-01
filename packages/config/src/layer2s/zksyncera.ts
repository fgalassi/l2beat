import { EthereumAddress, ProjectId, UnixTime } from '@l2beat/shared'

import { ProjectDiscovery } from '../discovery/ProjectDiscovery'
import { VALUES } from '../discovery/values'
import { formatSeconds } from '../utils/formatSeconds'
import {
  CONTRACTS,
  DATA_AVAILABILITY,
  EXITS,
  FORCE_TRANSACTIONS,
  makeBridgeCompatible,
  NEW_CRYPTOGRAPHY,
  NUGGETS,
  OPERATOR,
  RISK_VIEW,
  STATE_CORRECTNESS,
} from './common'
import { Layer2 } from './types'

const discovery = new ProjectDiscovery('zksync2')

const executionDelay = discovery.getContractValue<number>(
  'ValidatorTimelock',
  'executionDelay',
)
const delay = executionDelay > 0 && formatSeconds(executionDelay)

export const zksyncera: Layer2 = {
  type: 'layer2',
  id: ProjectId('zksync2'),
  display: {
    name: 'zkSync Era',
    slug: 'zksync-era',
    warning: delay
      ? `Withdrawals are delayed by ${delay}. The length of the delay can be arbitrarily set by a MultiSig.`
      : undefined,
    description:
      'zkSync Era is a general-purpose zk-rollup platform from Matter Labs aiming at implementing nearly full EVM compatibility in its zk-friendly custom virtual machine.\
      It implements standard Web3 API and it preserves key EVM features such as smart contract composability while introducing some new concept such as native account abstraction.',
    purpose: 'Universal',
    links: {
      websites: ['https://zksync.io/', 'https://ecosystem.zksync.io/'],
      apps: ['https://bridge.zksync.io/', 'https://portal.zksync.io/'],
      documentation: ['https://era.zksync.io/docs/'],
      explorers: ['https://explorer.zksync.io/'],
      repositories: ['https://github.com/matter-labs/zksync-era'],
      socialMedia: [
        'https://blog.matter-labs.io/',
        'https://join.zksync.dev/',
        'https://t.me/zksync',
        'https://twitter.com/zksync',
      ],
    },
    activityDataSource: 'Blockchain RPC',
  },
  config: {
    escrows: [
      discovery.getEscrowDetails({
        address: EthereumAddress('0x32400084C286CF3E17e7B677ea9583e60a000324'),
        sinceTimestamp: new UnixTime(1676268575),
        tokens: ['ETH'],
        description: 'Main rollup contract, additionally serving as an escrow.',
      }),
      discovery.getEscrowDetails({
        address: EthereumAddress('0x57891966931Eb4Bb6FB81430E6cE0A03AAbDe063'),
        sinceTimestamp: new UnixTime(1676367083),
        tokens: ['USDC', 'PERP', 'MUTE'],
        description:
          'Standard bridge for depositing ERC20 tokens to zkSync Era.',
      }),
    ],
    transactionApi: {
      type: 'rpc',
      startBlock: 1,
      url: 'https://mainnet.era.zksync.io',
      callsPerMinute: 1500,
    },
  },
  riskView: makeBridgeCompatible({
    stateValidation: {
      value: 'ZK proofs',
      description:
        'Uses PLONK zero-knowledge proof system with KZG commitments.',
      references: [
        'https://etherscan.io/address/0x3dB52cE065f728011Ac6732222270b3F2360d919#code#F5#L89',
        'https://etherscan.io/address/0x389a081BCf20e5803288183b929F08458F1d863D#code#F10#L254',
        'https://etherscan.io/address/0xF1fB730b7f8E8391B27B91f8f791e10E4a53CEcc#code#F7#L24',
        'https://etherscan.io/address/0x473b1887d45d61efd87731a1d8ec3590b93c565d#code#F5#L227',
        'https://era.zksync.io/docs/dev/developer-guides/transactions/transactions.html#transaction-types',
        'https://era.zksync.io/docs/dev/developer-guides/system-contracts.html#executorfacet',
      ],
      contracts: ['ValidatorTimelock', 'DiamondProxy', 'Verifier'],
    },
    dataAvailability: {
      value: 'On chain (SD)',
      description:
        'All of the data (SD = state diffs) needed for proof construction is published on chain.',
      references: [
        'https://etherscan.io/address/0x3dB52cE065f728011Ac6732222270b3F2360d919#code#F5#L71',
        'https://etherscan.io/address/0x389a081BCf20e5803288183b929F08458F1d863D#code#F10#L149',
        'https://etherscan.io/address/0x389a081BCf20e5803288183b929F08458F1d863D#code#F11#L41',
        'https://etherscan.io/tx/0xef9ad50d9b6a30365e4cc6709a5b7479fb67b8948138149597c49ef614782e1b', // example tx (see calldata)
        'https://era.zksync.io/docs/dev/developer-guides/system-contracts.html#executorfacet',
      ],
      contracts: ['ValidatorTimelock', 'DiamondProxy'],
    },
    upgradeability: {
      ...VALUES.ZKSYNC_2.UPGRADEABILITY,
      references: [
        'https://etherscan.io/address/0x2a2d6010202B93E727b61a60dfC1d5CF2707c1CE#code#F8#L121',
        'https://etherscan.io/address/0x2a2d6010202B93E727b61a60dfC1d5CF2707c1CE#code#F6#L51',
      ],
      contracts: ['DiamondProxy'],
    },
    sequencerFailure: {
      value: 'Transact using L1',
      description:
        'L2 transactions can be forced through L1 by adding them to append only queue on L1, which is processed sequentially by Sequencer, meaning that the individual user cannot be censored. At the moment there is no mechanism that forces L2 Sequencer to empty the L1 queue.',
      sentiment: 'warning',
      references: [
        'https://era.zksync.io/docs/dev/developer-guides/bridging/l1-l2-interop.html#priority-queue',
        'https://era.zksync.io/docs/dev/developer-guides/bridging/l1-l2-interop.html#priority-mode',
        'https://etherscan.io/address/0x389a081BCf20e5803288183b929F08458F1d863D#code#F13#L56',
        'https://etherscan.io/address/0x389a081BCf20e5803288183b929F08458F1d863D#code#F13#L73',
      ],
      contracts: ['DiamondProxy'],
    },
    validatorFailure: {
      value: 'No mechanism',
      description:
        'Only whitelisted validators can update the state on L1, so in the event of failure the withdrawals are blocked.',
      sentiment: 'bad',
    },
    destinationToken: RISK_VIEW.NATIVE_AND_CANONICAL(),
    validatedBy: RISK_VIEW.VALIDATED_BY_ETHEREUM,
  }),
  technology: {
    provider: 'zkSync',
    category: 'ZK Rollup',
    stateCorrectness: {
      ...STATE_CORRECTNESS.VALIDITY_PROOFS,
      references: [
        {
          text: 'Validity proofs - zkSync FAQ',
          href: 'https://era.zksync.io/docs/dev/fundamentals/rollups.html#optimistic-rollups-versus-zk-rollups',
        },
      ],
    },
    newCryptography: {
      ...NEW_CRYPTOGRAPHY.ZK_SNARKS,
      references: [
        {
          text: "What are rollups? - Developer's documentation",
          href: 'https://era.zksync.io/docs/dev/fundamentals/rollups.html#what-are-zk-rollups',
        },
      ],
    },
    dataAvailability: {
      ...DATA_AVAILABILITY.ON_CHAIN,
      references: [],
    },
    operator: {
      ...OPERATOR.CENTRALIZED_OPERATOR,
      references: [],
    },
    forceTransactions: {
      name: 'Users can force any transaction via L1',
      description:
        'If a user is censored by L2 Sequencer, they can try to force transaction via L1 queue. Right now there is no mechanism that forces L2 Sequencer to include\
        transactions from L1 queue in an L1 block.',
      risks: FORCE_TRANSACTIONS.NO_MECHANISM.risks,
      references: [
        {
          text: "L1 - L2 interoperability - Developer's documentation'",
          href: 'https://era.zksync.io/docs/dev/developer-guides/bridging/l1-l2-interop.html#priority-queue',
        },
      ],
    },
    exitMechanisms: [
      {
        ...EXITS.REGULAR('zk', 'merkle proof'),
        references: [
          {
            text: 'Withdrawing funds - zkSync documentation',
            href: 'https://era.zksync.io/docs/dev/developer-guides/bridging/bridging-asset.html',
          },
        ],
      },
      {
        name: 'Forced exit',
        description:
          'If the user experiences censorship from the operator with regular exit they can submit their withdrawal requests directly on L1. \
          The system is then obliged to service this request. Once the force operation is submitted if the request is serviced the operation \
          follows the flow of a regular exit. Note that this mechanism is not implemented yet.',
        risks: [
          {
            category: 'Funds can be frozen if',
            text: 'a user withdrawal request is censored.',
            isCritical: true,
          },
        ],
        references: [
          {
            text: "L1 - L2 interoperability - Developer's documentation",
            href: 'https://era.zksync.io/docs/dev/developer-guides/bridging/l1-l2-interop.html#priority-queue',
          },
        ],
      },
    ],
  },
  contracts: {
    addresses: [
      discovery.getContractDetails(
        'DiamondProxy',
        'The main Rollup contract. Operator commits blocks, provides zkProof which is validated by the Verifier contract \
      and process transactions (executes blocks). During block execution it processes L1 --> L2 and L2 --> L1 transactions.\
      It uses separate Verifier to validate zkProofs. Governance manages list of Validators and can set basic rollup parameters.\
      It is also serves the purpose of ETH bridge.',
      ),
      discovery.getContractDetails(
        'Verifier',
        'Implements zkProof verification logic.',
      ),
      discovery.getContractDetails(
        'ValidatorTimelock',
        'Contract delaying block execution (ie withdrawals and other L2 --> L1 messages).',
      ),
    ],
    risks: [CONTRACTS.UPGRADE_NO_DELAY_RISK],
  },
  permissions: [
    ...discovery.getMultisigPermission(
      'zkSync Era MultiSig',
      'This MultiSig is the current Governor of zkSync Era main contract and owner of the L1EthBridge. It can upgrade zkSync Era, upgrade bridge, change rollup parameters with no delay.',
    ),
    {
      name: 'Active validator',
      accounts: [
        discovery.getPermissionedAccount('ValidatorTimelock', 'validator'),
      ],
      description:
        'This actor is allowed to propose, revert and execute L2 blocks on L1.',
    },
    VALUES.ZKSYNC_2.SECURITY_COUNCIL,
  ],
  milestones: [
    {
      name: 'zkSync 2.0 baby alpha launch',
      link: 'https://blog.matter-labs.io/baby-alpha-has-arrived-5b10798bc623',
      date: '2022-10-28T00:00:00Z',
      description: 'zkSync 2.0 baby alpha is launched on mainnet.',
    },
    {
      name: 'Fair Onboarding Alpha and Rebranding',
      link: 'https://blog.matter-labs.io/all-aboard-zksync-era-mainnet-8b8964ba7c59',
      date: '2023-02-16T00:00:00Z',
      description:
        'zkSync 2.0 rebrands to zkSync Era and lets registered projects and developers deploy on mainnet.',
    },
    {
      name: 'Full Launch Alpha',
      link: 'https://blog.matter-labs.io/gm-zkevm-171b12a26b36',
      date: '2023-03-24T00:00:00Z',
      description: 'zkSync Era is now permissionless and open for everyone.',
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
