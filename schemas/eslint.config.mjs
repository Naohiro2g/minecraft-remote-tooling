import { eslintConfigScratch } from 'eslint-config-scratch'
import globals from 'globals'

export default eslintConfigScratch.defineConfig(eslintConfigScratch.recommended, {
  languageOptions: { globals: globals.node },
})
