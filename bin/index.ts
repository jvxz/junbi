#!/usr/bin/env node
import fs from 'node:fs/promises'
import { cancel, confirm, intro, isCancel, multiselect, outro, select, spinner } from '@clack/prompts'
import chalk from 'chalk'
import { Effect } from 'effect'
import { execa } from 'execa'

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

function handleCancel() {
  cancel('aborting...')
  process.exit(1)
}

function program() {
  return Effect.gen(function* (_) {
    intro(chalk.bold.magentaBright.inverse(' junbi '))

    const framework = yield* _(Effect.tryPromise({
      try: async () => select({
        message: 'What are you using?',
        options: [
          {
            value: 'react',
            label: 'React',
          },
          {
            value: 'vanilla',
            label: 'Vanilla',
          },
        ],
      }),
      catch: () => new EnvironmentSelectionError(),
    }))

    if (isCancel(framework)) return handleCancel()

    let tools: symbol | string[] = []

    if (framework === 'react') {
      tools = yield* _(Effect.tryPromise({
        try: async () => multiselect({
          message: 'Select your tools:',
          options: [
            {
              value: '@next/eslint-plugin-next',
              label: 'Next.js',
            },
            {
              value: 'eslint-plugin-readable-tailwind',
              label: 'Tailwind',
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
        message: 'Install dependencies?',
      }),
      catch: () => new DepInstallError(),
    }))

    if (isCancel(shouldInstallDeps)) return handleCancel()

    const s = spinner()

    if (shouldInstallDeps) {
      s.start('Installing dependencies...')
      yield* _(Effect.tryPromise({
        try: async () => execa('npx', ['ni', '-D', 'eslint', '@antfu/eslint-config', ...tools]),
        catch: () => new DepInstallError(),
      }))
      s.stop('Dependencies installed')
    }

    s.start('Writing eslint config...')

    yield* _(Effect.tryPromise({
      try: async () => fs.writeFile('eslint.config.mjs', ''),
      catch: () => new ConfigWriteError(),
    }))

    s.stop('Config written')

    outro('Done! ✨')
  })
}

void Effect.runPromise(program().pipe(Effect.catchAll((err) => {
  cancel(err.description)
  return Effect.fail(err)
})))

