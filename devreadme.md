# Scrybble

## Development on a new machine

```shell
npm i
# go to your obsidian folder
# cd ~/Lauranomicon/.obsidian
mkdir -p plugins
cd plugins
# symlink this project to the plugins folder
ln -s 
```

## Development

`npm run dev`

You need to restart Obsidian whenever you make a change

## Release

1. [ ] Run `npm version {patch|minor|major}` after updating (if necessary) `minAppVersion` in `manifest.json`
2. [ ] run `npm run build`
3. [ ] On Github, create new release with tag `v{YOUR VERSION}`
	- Attach `main.js`, `main.css` and `manifest.json`
