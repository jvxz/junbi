#!/usr/bin/env node
import type { FrameworkOption, ToolOption } from '../lib/types'
import fs from 'node:fs/promises'
import { detect } from '@antfu/ni'
import { cancel, confirm, intro, isCancel, multiselect, outro, select, spinner } from '@clack/prompts'
import chalk from 'chalk'
import { Effect } from 'effect'
import { execa } from 'execa'
import prettier from 'prettier'
import { baseRules, nextjsRules, reactRules, tailwindRules } from '../lib/config-rules/index.ts'

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

function program() {
  return Effect.gen(function* (_) {
    intro(chalk.bold.magentaBright.inverse(' junbi '))

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

    if (existingConfigFileName) {
      const proceedToOverwrite = yield* _(Effect.tryPromise({
        try: async () => confirm({
          message: 'eslint config already exists. proceed to overwrite?',
        }),
        catch: () => new ConfigOverwriteError(),
      }))

      if (isCancel(proceedToOverwrite)) return handleCancel()

      if (!proceedToOverwrite) return handleCancel()
    }

    const framework = yield* _(Effect.tryPromise({
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

    if (isCancel(framework)) return handleCancel()

    let tools: symbol | ToolOption[] = []

    if (framework === 'react') {
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

    const shouldInstallDeps = yield* _(Effect.tryPromise({
      try: async () => confirm({
        message: 'install dependencies?',
      }),
      catch: () => new DepInstallError(),
    }))

    if (isCancel(shouldInstallDeps)) return handleCancel()

    const s = spinner()

    if (shouldInstallDeps) {
      s.start(`installing dependencies... (using \`${packageManager}\`)`)
      yield* _(Effect.tryPromise({
        try: async () => execa(packageManager, ['install', '-D', 'eslint', '@antfu/eslint-config', ...tools]),
        catch: () => new DepInstallError(),
      }))
      s.stop('dependencies installed')
    }

    s.start('writing eslint config..')

    yield* _(Effect.tryPromise({
      try: async () => {
        const configContent = await getConfigContent(framework, tools)

        if (existingConfigFileName) await fs.writeFile(existingConfigFileName, configContent)
        else await fs.writeFile('eslint.config.mjs', configContent)
      },
      catch: () => new ConfigWriteError(),
    }))

    s.stop(`eslint config written (${chalk.underline('you may need to restart your eslint server in your ide')})`)

    outro('done! ✨')
  })
}

void Effect.runPromise(program().pipe(Effect.catchAll((err) => {
  cancel(err.description)
  return Effect.fail(err)
})))

async function getConfigContent(
  framework: FrameworkOption,
  tools: ToolOption[],
) {
  let pluginsString = ''

  if (pluginsString.length > 0) {
    pluginsString = tools
      .map((tool) => {
        if (tool === '@next/eslint-plugin-next') return 'next: true'
        if (tool === 'eslint-plugin-readable-tailwind')
          return 'readableTailwind: true'
        return ''
      })
      .join(',')
  }

  const rulesString = `
    ${framework === 'react' ? reactRules : ''}

    ${tools.includes('@next/eslint-plugin-next') ? nextjsRules : ''}

    ${tools.includes('eslint-plugin-readable-tailwind') ? tailwindRules : ''}
    ${baseRules}
  `

  return prettier.format(
    `
    import antfu from '@antfu/eslint-config'

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

    rules: ${rulesString}
    
  })
  `.trim(),
    {
      parser: 'babel',
    },
  )
}

function handleCancel() {
  cancel('aborting..')
  process.exit(1)
}
