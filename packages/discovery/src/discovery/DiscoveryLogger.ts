import { EthereumAddress, Logger } from '@l2beat/shared'
import chalk from 'chalk'

interface LoggerOptions {
  enabled: boolean
}

export class DiscoveryLogger {
  private serverLogs = ''

  constructor(
    private readonly logger: Logger,
    private readonly options: LoggerOptions,
  ) {}

  static SILENT = new DiscoveryLogger(Logger.SILENT, { enabled: false })
  static CLI = new DiscoveryLogger(Logger.SILENT, { enabled: true })
  static SERVER = (logger: Logger) =>
    new DiscoveryLogger(logger, { enabled: false })

  flushToServer(service: string, project: string) {
    this.logger
      .for(service)
      .info(`Printing discovery logs for [${project}]:\n` + this.serverLogs)

    this.serverLogs = ''
  }

  log(message: string) {
    this.serverLogs += message + '\n'

    if (!this.options.enabled) {
      return
    }

    console.log(message)
  }

  logExecution(field: string, values: string[]) {
    const dots = '.'.repeat(Math.max(1, 25 - field.length))
    const content = values
      .map((v, i) => (i % 2 === 0 ? v : chalk.blue(v)))
      .join('')

    this.log(`  ${chalk.yellow(field)} ${chalk.gray(dots)} ${content}`)
  }

  logSkip(address: EthereumAddress, reason: string) {
    this.log(`Skipping ${address.toString()}`)
    if (reason.startsWith('Error: ')) {
      const message = reason.slice('Error: '.length)
      this.log(`  Error: ${chalk.red(message)}`)
    } else {
      this.log(`  Reason: ${reason}`)
    }
    this.log('')
  }

  logRelatives(relatives: EthereumAddress[]) {
    if (relatives.length > 0) {
      this.log(`  New relatives found: ${relatives.length}`)
      for (const relative of relatives) {
        this.log(`    - ${relative.toString()}`)
      }
    }
    this.log('')
  }

  logEoa() {
    this.log(`  Type: ${chalk.blue('EOA')}`)
  }

  logName(name: string) {
    this.log(`  Name: ${chalk.bold(name)}`)
  }

  logConfiguredButUndiscovered(override: string) {
    this.log(
      `${chalk.red('Override for')} ${chalk.bold(override)} ${chalk.red(
        'was configured, but the address was not discovered',
      )}`,
    )
  }

  logProxyDetected(type: string) {
    this.log(`  Proxy detected: ${chalk.bgRed.whiteBright(` ${type} `)}`)
  }

  logProxyDetectionFailed(type: string) {
    this.log(
      `  Manual proxy detection failed: ${chalk.bgRed.whiteBright(
        ` ${type} `,
      )}`,
    )
  }
}
