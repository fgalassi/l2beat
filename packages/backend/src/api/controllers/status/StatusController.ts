import { ConfigReader, DiscoveryDiff } from '@l2beat/discovery'
import { getTimestamps, Hash256, UnixTime } from '@l2beat/shared'

import { getBalanceConfigHash } from '../../../core/balances/getBalanceConfigHash'
import { Clock } from '../../../core/Clock'
import { getReportConfigHash } from '../../../core/reports/getReportConfigHash'
import { Project } from '../../../model'
import { Token } from '../../../model/Token'
import {
  BalanceStatusRecord,
  BalanceStatusRepository,
} from '../../../peripherals/database/BalanceStatusRepository'
import { UpdateMonitorRepository } from '../../../peripherals/database/discovery/UpdateMonitorRepository'
import { PriceRepository } from '../../../peripherals/database/PriceRepository'
import { ReportStatusRepository } from '../../../peripherals/database/ReportStatusRepository'
import { getDashboardContracts } from './discovery/props/getDashboardContracts'
import { getDashboardProjects } from './discovery/props/getDashboardProjects'
import { getDiff } from './discovery/props/utils/getDiff'
import { renderDashboardPage } from './discovery/view/DashboardPage'
import { renderDashboardProjectPage } from './discovery/view/DashboardProjectPage'
import { renderBalancesPage } from './view/BalancesPage'
import { renderPricesPage } from './view/PricesPage'
import { renderReportsPage } from './view/ReportsPage'

export class StatusController {
  constructor(
    private readonly priceRepository: PriceRepository,
    private readonly balanceStatusRepository: BalanceStatusRepository,
    private readonly reportStatusRepository: ReportStatusRepository,
    private readonly updateMonitorRepository: UpdateMonitorRepository,
    private readonly clock: Clock,
    private readonly tokens: Token[],
    private readonly projects: Project[],
    private readonly configReader: ConfigReader,
  ) {}

  async getDiscoveryDashboard(): Promise<string> {
    const projects = await getDashboardProjects(
      this.configReader,
      this.updateMonitorRepository,
    )
    const projectsList = this.projects.map((p) => p.projectId.toString())

    return renderDashboardPage({
      projects,
      projectsList,
    })
  }

  async getDiscoveryDashboardProject(project: string): Promise<string> {
    const discovery = await this.configReader.readDiscovery(project)
    const config = await this.configReader.readConfig(project)
    const contracts = getDashboardContracts(discovery, config)

    const diff: DiscoveryDiff[] = await getDiff(
      this.updateMonitorRepository,
      discovery,
      config,
    )

    return renderDashboardProjectPage({
      projectName: project,
      contracts,
      diff,
    })
  }

  async getPricesStatus(
    from: UnixTime | undefined,
    to: UnixTime | undefined,
  ): Promise<string> {
    const firstHour = this.getFirstHour(from)
    const lastHour = to ? to : this.clock.getLastHour()

    const pricesByToken = await this.priceRepository.findLatestByTokenBetween(
      firstHour,
      lastHour,
    )

    const prices = this.tokens.map((token) => {
      const latest = pricesByToken.get(token.id)

      return {
        assetId: token.id,
        timestamp: latest,
        isSynced: latest?.toString() === lastHour.toString(),
      }
    })

    return renderPricesPage({ prices })
  }

  async getBalancesStatus(
    from: UnixTime | undefined,
    to: UnixTime | undefined,
  ): Promise<string> {
    const firstHour = this.getFirstHour(from)
    const lastHour = to ? to : this.clock.getLastHour()

    const timestamps = getTimestamps(firstHour, lastHour, 'hourly').reverse()

    const statuses = await this.balanceStatusRepository.getBetween(
      firstHour,
      lastHour,
    )
    const configHash = getBalanceConfigHash(this.projects)

    const balances = timestamps.map((timestamp) => ({
      timestamp,
      isSynced: isSynced(statuses, timestamp, configHash),
    }))

    return renderBalancesPage({ balances })
  }

  async getReportsStatus(from: UnixTime | undefined, to: UnixTime | undefined) {
    const firstHour = this.getFirstHour(from)
    const lastHour = to ? to : this.clock.getLastHour()

    const timestamps = getTimestamps(firstHour, lastHour, 'hourly').reverse()

    const statuses = await this.reportStatusRepository.getBetween(
      firstHour,
      lastHour,
    )
    const configHash = getReportConfigHash(this.projects)

    const reports = timestamps.map((timestamp) => ({
      timestamp,
      isSynced: isSynced(statuses, timestamp, configHash),
    }))

    return renderReportsPage({ reports })
  }

  private getFirstHour(from: UnixTime | undefined) {
    if (from) {
      return from
    } else {
      const firstHour = this.clock.getFirstHour()
      const lastHour = this.clock.getLastHour()
      if (firstHour.gt(lastHour.add(-90, 'days'))) {
        return firstHour
      } else {
        return lastHour.add(-90, 'days')
      }
    }
  }
}

function isSynced(
  statuses: BalanceStatusRecord[],
  timestamp: UnixTime,
  configHash: Hash256,
): boolean {
  return (
    statuses.find((s) => s.timestamp.toString() === timestamp.toString())
      ?.configHash === configHash
  )
}
