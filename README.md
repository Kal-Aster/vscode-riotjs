# RiotJS VSCode Extension

A Visual Studio Code extension that provides comprehensive support for RiotJS components (.riot files), including syntax highlighting, autocompletion and TypeScript integration.

## Features

- Syntax highlight
- Autocompletion for HTML template
- Autocompletion for CSS content in `<style>` tag
- Autocompletion for Javascript in `<script>` tag
- Autocompletion for Javascript in riot expressions
- Typescript support
- Go to definition support
- Hover information
- Auto-closing tags

## Typescript support

Currently the Typescript compiler uses only the following options:
```json
{
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "NodeNext",
    "allowJs": true,
    "checkJs": true,
    "strict": true
}
```

It will support the `tsconfig.json` configuration in the near future.

The type generation of the components currently supports only `export default` component style.
It's very recommended the use of the `withTypes` function, because otherwise the exported value won't be recognized as a `RiotComponent` when imported from other component files.

```html
<component>
    <!-- component markup -->

    <script lang='ts'>
        import { withTypes } from "riot";

        export default withTypes({
            // component implementation
        })
    </script>
</component>
```
