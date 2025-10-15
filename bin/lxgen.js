#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a.startsWith("--")) {
      const k = a.slice(2)
      const v = args[i + 1] && !args[i + 1].startsWith("--") ? args[++i] : true
      out[k] = v
    }
  }
  return out
}
function ensureDir(p) { if (!existsSync(p)) mkdirSync(p, { recursive: true }) }
function write(p, c) { ensureDir(dirname(p)); writeFileSync(p, c) }

function tplFxManifest(o) {
  const ui = o.nui ? "\nui_page \"web/index.html\"" : ""
  const files = o.nui ? "\nfiles { \"web/index.html\", \"web/style.css\", \"web/app.js\" }" : ""
  return `fx_version \"cerulean\"
game \"gta5\"
lua54 \"yes\"${ui}
name \"${o.name}\"
author \"${o.author}\"
version \"1.0.1\"
server_scripts { \"server/main.lua\" }
client_scripts { \"client/main.lua\" }
shared_script \"config.lua\"${files}
`
}

function tplConfig(o) {
  return `Config = {}
Config.Framework = \"${o.framework}\"
Config.ResourceName = \"${o.name}\"
Config.Locale = \"${o.locales[0]}\"
Core = {}
Locales = {}
ActiveLocale = Config.Locale
`
}

function tplClient(o) {
  const nuiOpen = o.nui ? `
local open = false
RegisterCommand('toggle_${o.short}', function()
  open = not open
  SetNuiFocus(open, open)
  SendNUIMessage({ action = open and 'open' or 'close' })
end)
RegisterNUICallback('close', function(_, cb)
  open = false
  SetNuiFocus(false, false)
  cb(true)
end)
` : ""
  const cmd = o.commands ? `
RegisterCommand('${o.short}', function()
  print('[${o.name}] client command')
end)
` : ""
  const core = `
function GetCore()
  if Config.Framework == 'qb' then
    return exports['qb-core']:GetCoreObject()
  elseif Config.Framework == 'esx' then
    return exports['es_extended']:getSharedObject()
  elseif Config.Framework == 'ox' then
    return lib or {}
  else
    return {}
  end
end
`
  return `${core}${cmd}${nuiOpen}`
}

function tplServer(o) {
  const cmd = o.commands ? `
RegisterCommand('${o.short}', function(src, args)
  print('[${o.name}] server command', src)
end, true)
` : ""
  const core = `
function GetCore()
  if Config.Framework == 'qb' then
    return exports['qb-core']:GetCoreObject()
  elseif Config.Framework == 'esx' then
    return exports['es_extended']:getSharedObject()
  elseif Config.Framework == 'ox' then
    return lib or {}
  else
    return {}
  end
end
`
  return `${core}${cmd}`
}

function tplWebHtml(o) {
  return `<!doctype html>
<html>
<head>
<meta charset=\"utf-8\">
<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">
<link rel=\"stylesheet\" href=\"style.css\">
<title>${o.name}</title>
</head>
<body>
<div id=\"app\" class=\"panel\">
<h1>${o.name}</h1>
<button id=\"close\">Close</button>
</div>
<script src=\"app.js\"></script>
</body>
</html>
`
}
function tplWebCss() { return `html,body{margin:0;height:100%}body{display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6)}.panel{background:#111;color:#fff;border-radius:16px;padding:24px;min-width:320px;box-shadow:0 10px 30px rgba(0,0,0,.5)}` }
function tplWebJs() { return `window.addEventListener('message',e=>{if(e.data&&e.data.action==='open'){document.body.style.display='flex'}if(e.data&&e.data.action==='close'){document.body.style.display='none'}});document.getElementById('close').addEventListener('click',()=>{fetch('https://'+GetParentResourceName()+'/close',{method:'POST',body:'{}'})})` }

function main() {
  const a = parseArgs()
  const name = a.name || "lx-resource"
  const framework = (a.framework || "qb").toLowerCase()
  const includeNui = !!a.nui
  const includeCommands = !!a.commands
  const locales = (a.locales ? String(a.locales) : "cs,en").split(",").map(s=>s.trim()).filter(Boolean)
  const author = a.author || "byAlex"
  const out = resolve(process.cwd(), name)
  const opts = { name, framework, locales, author, nui: includeNui, commands: includeCommands, short: name.replace(/[^a-zA-Z0-9]/g,'').toLowerCase() }
  ensureDir(out)
  write(resolve(out, "fxmanifest.lua"), tplFxManifest(opts))
  write(resolve(out, "config.lua"), tplConfig(opts))
  write(resolve(out, "server/main.lua"), tplServer(opts))
  write(resolve(out, "client/main.lua"), tplClient(opts))
  if (includeNui) {
    write(resolve(out, "web/index.html"), tplWebHtml(opts))
    write(resolve(out, "web/style.css"), tplWebCss())
    write(resolve(out, "web/app.js"), tplWebJs())
  }
  ensureDir(resolve(out, "locales"))
  for (const l of locales) { write(resolve(out, `locales/${l}.lua`), `return { ok = \"OK\", open = \"Open\", close = \"Close\" }\n`) }
  if (a.license) write(resolve(out, "LICENSE"), String(a.license))
  console.log("Created", out)
}
main()
