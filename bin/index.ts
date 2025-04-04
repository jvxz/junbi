#!/usr/bin/env node
import type { FrameworkOption, ToolOption } from '../lib/types'
import fs from 'node:fs/promises'
import { detect } from '@antfu/ni'
import { cancel, confirm, intro, isCancel, log, multiselect, outro, select, tasks } from '@clack/prompts'
import cac from 'cac'
import chalk from 'chalk'
import { Effect } from 'effect'
import { execa } from 'execa'
import { baseRules, nextjsRules, reactRules, tailwindRules } from '../lib/config-rules/index.ts'

class InvalidArgsError {
  readonly _tag = 'InvalidArgsError'
  readonly description = 'invalid arguments. vanilla config cannot be used with react, next, or tailwind'
}

class ConfigCheckError {
  readonly _tag = 'ConfigCheckError'
  readonly description = 'a fatal error occurred while checking for the eslint config'
}

class EnvironmentSelectionError {
  readonly _tag = 'EnvironmentSelectionError'
  readonly description = 'a fatal error occurred while selecting an environment'
}

class ToolSelectionError {
  readonly _tag = 'ToolSelectionError'
  readonly description = 'a fatal error occurred while selecting a tool'
}

class DepInstallError {
  readonly _tag = 'DepInstallError'
  readonly description = 'a fatal error occurred while installing dependencies'
}

class ConfigWriteError {
  readonly _tag = 'ConfigWriteError'
  readonly description = 'a fatal error occurred while writing the eslint config'
}

class ConfigOverwriteError {
  readonly _tag = 'ConfigOverwriteError'
  readonly description = 'a fatal error occurred while overwriting the eslint config'
}

class PackageManagerDetectionError {
  readonly _tag = 'PackageManagerDetectionError'
  readonly description = 'a fatal error occurred while detecting the package manager. are you in a node project?'
}

function program(args: unknown) {
  return Effect.gen(function* (_) {
    intro(chalk.bold.magentaBright.inverse(' junbi '))

    const { overwrite, installDeps, react, vanilla, next, tailwind } = yield* _(Effect.succeed(JSON.parse(JSON.stringify(args)) as {
      overwrite: boolean | undefined
      installDeps: boolean | undefined
      react: boolean | undefined
      vanilla: boolean | undefined
      next: boolean | undefined
      tailwind: boolean | undefined
    }))

    if (vanilla && (react || next || tailwind)) yield* _(Effect.fail(new InvalidArgsError()))

    // if (!react && (next || tailwind)) log.warn('next or tailwind were specified, but react was not. react rules will be added to the config')

    const packageManager = yield* _(Effect.tryPromise({
      try: async () => {
        const packageManager = await detect()
        if (!packageManager) throw new PackageManagerDetectionError()

        return packageManager
      },
      catch: () => new PackageManagerDetectionError(),
    }))

    const existingConfigFileName = yield* _(Effect.tryPromise({
      try: async () => {
        const files = await fs.readdir(process.cwd())
        return files.find(file => file.includes('eslint'))
      },
      catch: () => new ConfigCheckError(),
    }))

    if (existingConfigFileName && !overwrite) {
      const proceedToOverwrite = yield* _(Effect.tryPromise({
        try: async () => confirm({
          message: 'eslint config already exists. proceed to overwrite?',
        }),
        catch: () => new ConfigOverwriteError(),
      }))

      if (isCancel(proceedToOverwrite)) return handleCancel()

      if (!proceedToOverwrite) return handleCancel()
    }

    let framework: symbol | FrameworkOption

    if (vanilla) {
      framework = 'vanilla'
    }
    else if (react) {
      framework = 'react'
    }
    else if (next || tailwind) {
      framework = 'react'
    }
    else {
      framework = yield* _(Effect.tryPromise({
        try: async () => select({
          message: 'what are you using?',
          options: [
            {
              value: 'react',
              label: 'react',
            },
            {
              value: 'vanilla',
              label: 'vanilla',
            },
          ],
        }),
        catch: () => new EnvironmentSelectionError(),
      }))
    }

    if (isCancel(framework)) return handleCancel()

    let tools: symbol | ToolOption[] = []

    if (tailwind) {
      tools.push('eslint-plugin-readable-tailwind')
    }

    if (next) {
      tools.push('@next/eslint-plugin-next')
    }

    if (framework === 'react' && (!tailwind && !next)) {
      tools = yield* _(Effect.tryPromise({
        try: async () => multiselect({
          message: 'select your tools:',
          options: [
            {
              value: '@next/eslint-plugin-next',
              label: 'next.js',
            },
            {
              value: 'eslint-plugin-readable-tailwind',
              label: 'tailwind',
            },
          ],
          required: false,
        }),
        catch: () => new ToolSelectionError(),
      }))

      if (isCancel(tools)) return handleCancel()
    }

    let shouldInstallDeps: symbol | boolean = false
    if (installDeps) shouldInstallDeps = true

    shouldInstallDeps = yield* _(Effect.tryPromise({
      try: async () => confirm({
        message: 'install dependencies?',
      }),
      catch: () => new DepInstallError(),
    }))

    if (isCancel(shouldInstallDeps)) return handleCancel()

    if (shouldInstallDeps) {
      yield* _(Effect.tryPromise({
        try: async () => tasks([
          {
            title: `installing dependencies... (using ${packageManager})`,
            task: async () => {
              const packages: string[] = [...tools]
              if (react) packages.push('@eslint-react/eslint-plugin eslint-plugin-react-refresh')

              await execa(packageManager, ['install', '-D', 'eslint', '@antfu/eslint-config', ...packages])
              return 'dependencies installed'
            },
          },
        ]),
        catch: () => new DepInstallError(),
      }))
    }

    yield* _(Effect.tryPromise({
      try: async () => tasks([
        {
          title: 'writing eslint config...',
          task: async () => {
            const configContent = await getConfigContent(framework, tools)

            if (existingConfigFileName) await fs.writeFile(existingConfigFileName, configContent)
            else await fs.writeFile('eslint.config.mjs', configContent)

            return 'eslint config written'
          },
        },
      ]),
      catch: () => new ConfigWriteError(),
    }))

    log.info(`${chalk.bold('next steps:')}  

  1. ${chalk.bold(`${packageManager} eslint --fix ${existingConfigFileName ?? 'eslint.config.mjs'}`)}
  2. ${chalk.bold.underline('https://github.com/antfu/eslint-config#ide-support-auto-fix-on-save')}
  3. restart the eslint server in your ide (optional)
  
for more information, visit ${chalk.bold.underline('https://github.com/jvxz/junbi')}`)
    outro('done! ✨')
  })
}

async function getConfigContent(
  framework: FrameworkOption,
  tools: ToolOption[],
) {
  let importsString = ''

  if (tools.length > 0) {
    importsString = `
      ${tools.map((tool) => {
        if (tool === '@next/eslint-plugin-next') return 'import nextPlugin from "@next/eslint-plugin-next"'
        if (tool === 'eslint-plugin-readable-tailwind') return 'import tailwindPlugin from "eslint-plugin-readable-tailwind"'
        return ''
      }).join('\n')}
    `
  }

  let pluginsString = ''

  if (tools.length > 0) {
    pluginsString = `plugins: {${tools
      .map((tool) => {
        if (tool === '@next/eslint-plugin-next') return '"next": nextPlugin'
        if (tool === 'eslint-plugin-readable-tailwind')
          return '"tailwind": tailwindPlugin'
        return ''
      })
      .join(',')}},`
  }

  const rulesString = `
    ${framework === 'react' ? reactRules : ''}

    ${tools.includes('@next/eslint-plugin-next') ? nextjsRules : ''}

    ${tools.includes('eslint-plugin-readable-tailwind') ? tailwindRules : ''}
    ${baseRules}
  `

  return `
      import antfu from '@antfu/eslint-config'
      ${importsString}

      export default antfu({
        ${framework === 'react' ? 'react: true,' : ''}
        typescript: {
        tsconfigPath: './tsconfig.json',
        overrides: {
          'ts/no-floating-promises': 'error',
          'ts/consistent-type-imports': 'error',
          ${
            framework === 'react'
              ? '\'react/no-leaked-conditional-rendering\': \'error\','
              : ''
          }
        },
        },
        ${pluginsString}
          ignores: [
        '**/node_modules/**',
        '**/dist/**',
        ${tools.includes('@next/eslint-plugin-next') ? '\'**/.next/**\'' : ''}
      ],

      rules: {${rulesString}}
      
    })
    `.trim()
}

function handleCancel() {
  cancel('aborting..')
  process.exit(1)
}

const cli = cac('junbi')

cli
  .command('', 'run initialization wizard')
  .option('-o, --overwrite', 'automatically overwrite existing config')
  .option('-i, --install-deps', 'automatically install dependencies')
  .option('-r, --react', 'generate config with react rules')
  .option('-v, --vanilla', 'generate config with vanilla rules')
  .option('-n, --next', 'generate config with next.js rules')
  .option('-t, --tailwind', 'generate config with tailwind rules')
  .action(async (args) => {
    await Effect.runPromise(program(args).pipe(Effect.catchAll((err) => {
      cancel(err.description)
      return Effect.fail(err)
    })))
  })

cli.help()

cli.parse()
