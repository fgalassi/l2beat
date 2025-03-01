import { ContractParameters, EthereumAddress } from '@l2beat/shared'

import { DiscoveryConfig } from '../config/DiscoveryConfig'
import { DiscoveryOverrides } from '../config/DiscoveryOverrides'
import { diffContracts, FieldDiff } from './diffContracts'

export interface DiscoveryDiff {
  name: string
  address: EthereumAddress
  diff?: FieldDiff[]
  type?: 'created' | 'deleted'
}

export function diffDiscovery(
  committed: ContractParameters[],
  discovered: ContractParameters[],
  config: DiscoveryConfig,
): DiscoveryDiff[] {
  const modifiedOrDeleted: DiscoveryDiff[] = []

  for (const committedContract of committed) {
    const discoveredContract = discovered.find(
      (d) => d.address === committedContract.address,
    )
    if (discoveredContract === undefined) {
      modifiedOrDeleted.push({
        name: committedContract.name,
        address: committedContract.address,
        type: 'deleted',
      })
      continue
    }

    const ignored = getIgnored(committedContract.address, config.overrides)

    const diff = diffContracts(committedContract, discoveredContract, ignored)

    if (diff.length > 0) {
      modifiedOrDeleted.push({
        name: committedContract.name,
        address: committedContract.address,
        diff,
      })
    }
  }

  const created: DiscoveryDiff[] = []

  for (const discoveredContract of discovered) {
    const committedContract = committed.find(
      (c) => c.address === discoveredContract.address,
    )
    if (committedContract === undefined) {
      created.push({
        name: discoveredContract.name,
        address: discoveredContract.address,
        type: 'created',
      })
    }
  }

  return modifiedOrDeleted.concat(created)
}

function getIgnored(
  address: EthereumAddress,
  overrides: DiscoveryOverrides,
): string[] {
  return overrides.get(address).ignoreInWatchMode ?? []
}
