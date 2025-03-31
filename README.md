# junbi 🎀

[![code style](https://antfu.me/badge-code-style.svg)](https://github.com/antfu/eslint-config)

my personal eslint config initializer, offering an edited version of [`@antfu/eslint-config`](https://github.com/antfu/eslint-config)

## usage

```bash
npx junbi

# -o, --overwrite     automatically overwrite existing config
# -i, --install-deps  automatically install dependencies
# -r, --react         generate config with react rules
# -v, --vanilla       generate config with vanilla rules
# -n, --next          generate config with next.js rules
# -t, --tailwind      generate config with tailwind rules
# -h, --help          display help
```

## customization

if you are looking to customize the config, it is simply a matter of following the [customization documentation](https://github.com/antfu/eslint-config#customization) of [`@antfu/eslint-config`](https://github.com/antfu/eslint-config). however, if you find yourself editing a large amount of the config, it may be worth considering to use [`@antfu/eslint-config`](https://github.com/antfu/eslint-config) directly

## formatting

due to the opinionated nature of junbi, it ditches the concept of using formatters, including [prettier](https://prettier.io/). instead, it uses [eslint stylistic](https://eslint.style/) to format code. as a side effect of this, you may experience more errors than usual. to mitigate these errors, check out the settings configs offered by [`@antfu/eslint-config`](https://github.com/antfu/eslint-config#ide-support-auto-fix-on-save)

## philosophy

i have found myself frequently beginning many new projects & being uncomfortable without having my main formatting & linting. i made this package to mostly assist myself in initiating my config

<!-- ### libraries

- [@clack/prompts](https://github.com/clack/prompts)
- [effect](https://effect.website/)
- [chalk](https://github.com/chalk/chalk)
- [`@antfu/eslint-config](https://github.com/antfu/eslint-config)
- [@antfu/ni](https://github.com/antfu/ni) -->

## license

[MIT](./LICENSE) 2025 ― present [@jvxz](https://github.com/jvxz)
