#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync } from "fs"
import { resolve, dirname } from "path"

function args() {
  const a = process.argv.slice(2)
  const o = {}
  for (let i = 0; i < a.length; i++) {
    const tok = a[i]
    if (tok.startsWith("--")) {
      const k = tok.slice(2)
      const v = a[i + 1] && !a[i + 1].startsWith("--") ? a[++i] : true
      o[k] = v
    }
  }
  return o
}
function ensureDir(p){ if (!existsSync(p)) mkdirSync(p, { recursive: true }) }
function write(p,c){ ensureDir(dirname(p)); writeFileSync(p, c) }
function list(v){ return typeof v === "string" ? v.split(",").map(s=>s.trim()).filter(Boolean) : [] }

function tplFx(o){
  const ui = o.nui ? '\nui_page "web/index.html"' : ''
  const files = o.nui ? '\nfiles { "web/index.html","web/style.css","web/app.js" }' : ''
  const deps = o.dependencies.length ? `\ndependencies { ${o.dependencies.map(s=>`"${s}"`).join(", ")} }` : ''
  const prov = o.provides.length ? `\nprovides { ${o.provides.map(s=>`"${s}"`).join(", ")} }` : ''
  const lua54 = o.lua54 ? '\nlua54 "yes"' : ''
  const shared = ['config.lua']
  if (o.useOxLib) shared.unshift('@ox_lib/init.lua')
  const sharedLine = `\nshared_scripts { ${shared.map(s=>`"${s}"`).join(", ")} }`
  const client = ['client/'+o.clientFile]
  if (o.modules) client.push('client/modules/**/*.lua')
  if (o.useOxTarget) client.push('client/target.lua')
  const server = ['server/'+o.serverFile]
  if (o.modules) server.push('server/modules/**/*.lua')
  if (o.sql) server.push('server/sql.lua')
  const expC = o.exports.client.length ? `\nexports { ${o.exports.client.map(e=>`"${e}"`).join(", ")} }` : ''
  const expS = o.exports.server.length ? `\nserver_exports { ${o.exports.server.map(e=>`"${e}"`).join(", ")} }` : ''
  return `fx_version "${o.fxVersion}"
game "gta5"${lua54}${ui}
name "${o.name}"
author "${o.author}"
version "${o.version}"
description "${o.description}"${sharedLine}
client_scripts { ${client.map(s=>`"${s}"`).join(", ")} }
server_scripts { ${server.map(s=>`"${s}"`).join(", ")} }${files}${deps}${prov}${expC}${expS}
`
}

function tplConfig(o){
  const kv = Object.entries(o.configKv).map(([k,v])=>`Config.${k} = ${typeof v==="string" ? `"${v}"` : v}`).join("\n")
  return `Config = {}
Config.Framework = "${o.framework}"
Config.ResourceName = "${o.name}"
Config.Locale = "${o.defaultLocale}"
Config.DB = "${o.db}"
Config.DBPrefix = "${o.dbPrefix}"
Config.DBInit = ${o.runSqlOnStart ? "true" : "false"}
${kv}
Core = {}
Locales = {}
ActiveLocale = Config.Locale
`
}

function tplLocale(){
  return `return {
 ok = "OK",
 close = "Close",
 open = "Open"
}
`
}

function tplClient(o){
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
  const k = o.keybind ? `
RegisterCommand('${o.short}_toggle', function()
  ToggleUI()
end)
RegisterKeyMapping('${o.short}_toggle', 'Toggle ${o.name}', 'keyboard', '${o.keybind}')
` : ''
  const nui = o.nui ? `
local uiOpen = false
function ToggleUI()
  uiOpen = not uiOpen
  SetNuiFocus(uiOpen, uiOpen)
  SendNUIMessage({ action = uiOpen and 'open' or 'close' })
end
RegisterNUICallback('close', function(_, cb)
  uiOpen = false
  SetNuiFocus(false, false)
  cb(true)
end)
` : ''
  const cmd = o.commands ? `
RegisterCommand('${o.short}', function()
  print('[${o.name}] client command')
end)
` : ''
  const ev = o.events.client ? `
RegisterNetEvent('${o.short}:notify', function(msg)
  print('[${o.name}] '..tostring(msg))
end)
` : ''
  const st = o.statebag ? `
AddStateBagChangeHandler(nil, nil, function(bag, key, val, _res, _replica)
end)
` : ''
  const tgt = o.useOxTarget ? `
CreateThread(function()
end)
` : ''
  return `${core}${cmd}${ev}${st}${k}${nui}${tgt}`
}

function tplServer(o){
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
  const cmd = o.commands ? `
RegisterCommand('${o.short}', function(src, args)
  print('[${o.name}] server command', src)
end, true)
` : ''
  const ev = o.events.server ? `
RegisterNetEvent('${o.short}:ping', function()
  local src = source
  TriggerClientEvent('${o.short}:notify', src, 'pong')
end)
` : ''
  const item = (o.useOxInventory && o.item) ? `
CreateThread(function()
  if GetResourceState('ox_inventory') ~= 'started' then return end
  exports.ox_inventory:RegisterUsableItem('${o.item}', function(data, slot)
    local src = data.source or source
    TriggerClientEvent('${o.short}:notify', src, '${o.item} used')
  end)
end)
` : ''
  const cbqb = (o.cb.qb && o.callbackName) ? `
CreateThread(function()
  if GetResourceState('qb-core') ~= 'started' then return end
  local QBCore = exports['qb-core']:GetCoreObject()
  QBCore.Functions.CreateCallback('${o.callbackName}', function(src, cb, ...)
    cb({ ok = true })
  end)
end)
` : ''
  const cbesx = (o.cb.esx && o.callbackName) ? `
CreateThread(function()
  if GetResourceState('es_extended') ~= 'started' then return end
  local ESX = exports['es_extended']:getSharedObject()
  ESX.RegisterServerCallback('${o.callbackName}', function(src, cb, ...)
    cb({ ok = true })
  end)
end)
` : ''
  const cbox = (o.cb.ox && o.callbackName) ? `
CreateThread(function()
  if not lib then return end
  lib.callback.register('${o.callbackName}', function(src, ...)
    return { ok = true }
  end)
end)
` : ''
  const expS = o.exports.server.map(e=>`
function ${e}(...)
end
`).join("")
  return `${core}${cmd}${ev}${item}${cbqb}${cbesx}${cbox}${expS}`
}

function tplServerSql(o){
  const pre = o.dbPrefix
  return `
local DB = {}

if Config.DB == 'oxmysql' then
  function DB.exec(sql, params, done) if MySQL and MySQL.query then MySQL.query(sql, params or {}, function(r) if done then done(r) end end) else exports.oxmysql:execute(sql, params or {}, function(r) if done then done(r) end end) end end
  function DB.scalar(sql, params, done) if MySQL and MySQL.scalar then MySQL.scalar(sql, params or {}, function(r) if done then done(r) end end) else exports.oxmysql:scalar(sql, params or {}, function(r) if done then done(r) end end) end end
elseif Config.DB == 'ghmatti' then
  function DB.exec(sql, params, done) exports.ghmattimysql:execute(sql, params or {}, function(r) if done then done(r) end end) end
  function DB.scalar(sql, params, done) exports.ghmattimysql:scalar(sql, params or {}, function(r) if done then done(r) end end) end
elseif Config.DB == 'mysqlasync' then
  function DB.exec(sql, params, done) MySQL.Async.execute(sql, params or {}, function(r) if done then done(r) end end) end
  function DB.scalar(sql, params, done) MySQL.Sync.fetchScalar(sql, params or {}) end
else
  function DB.exec(sql, params, done) if done then done(nil) end end
  function DB.scalar(sql, params, done) if done then done(nil) end end
end

RegisterNetEvent('${o.short}:log', function(action, data)
  local src = source
  DB.exec('INSERT INTO ${pre}demo_logs (identifier, action, data) VALUES (?, ?, ?)', { tostring(src), tostring(action), tostring(data or '') }, function() end)
end)

CreateThread(function()
  if not Config.DBInit then return end
  local sql = LoadResourceFile(GetCurrentResourceName(), 'sql/schema.sql')
  if not sql or #sql == 0 then return end
  for stmt in string.gmatch(sql, '([^;]+)') do
    local s = (stmt or ''):gsub('\r',''):gsub('\n',' '):gsub('%s+$','')
    if #s > 0 then DB.exec(s..';', {}) end
  end
end)
`
}

function webHtml(o){
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="style.css">
<title>${o.name}</title>
</head>
<body>
<div id="app" class="panel">
<h1>${o.name}</h1>
<button id="close">Close</button>
</div>
<script src="app.js"></script>
</body>
</html>`
}
function webCss(){ return 'html,body{margin:0;height:100%}body{display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.6)}.panel{background:#111;color:#fff;border-radius:16px;padding:24px;min-width:320px;box-shadow:0 10px 30px rgba(0,0,0,.5)}' }
function webJs(){ return 'window.addEventListener(\'message\',e=>{if(e.data&&e.data.action===\'open\'){document.body.style.display=\'flex\'}if(e.data&&e.data.action===\'close\'){document.body.style.display=\'none\'}});document.getElementById(\'close\').addEventListener(\'click\',()=>{fetch(\'https://\'+GetParentResourceName()+\'/close\',{method:\'POST\',body:\'{}\'})})' }

function main(){
  const a = args()
  const name = a.name || "lx-resource"
  const short = name.replace(/[^a-zA-Z0-9]/g,'').toLowerCase()
  const o = {
    name,
    short,
    framework: (a.framework || "qb").toLowerCase(),
    fxVersion: a.fx || "cerulean",
    lua54: a.lua54 === undefined ? true : String(a.lua54).toLowerCase() !== "false",
    nui: !!a.nui,
    commands: !!a.commands,
    events: {
      client: list(a.events||"").includes("client"),
      server: list(a.events||"").includes("server")
    },
    exports: {
      client: list((a.exports||"").split(",").filter(Boolean).filter(e=>e.startsWith("client:")).map(e=>e.split(":")[1]).join(",")),
      server: list((a.exports||"").split(",").filter(Boolean).filter(e=>e.startsWith("server:")).map(e=>e.split(":")[1]).join(","))
    },
    locales: list(a.locales || "cs,en"),
    defaultLocale: a["default-locale"] || (list(a.locales||"cs,en")[0]||"cs"),
    author: a.author || "byAlex",
    description: a.description || "",
    version: a.version || "1.5.1",
    dependencies: list(a.dependencies || ""),
    provides: list(a.provides || ""),
    useOxLib: !!a["use-ox-lib"],
    useOxTarget: !!a["use-ox-target"],
    useOxInventory: !!a["use-ox-inventory"],
    item: a.item || "",
    keybind: a.keybind || "",
    modules: !!a.modules,
    clientFile: a["client-file"] || "main.lua",
    serverFile: a["server-file"] || "main.lua",
    configKv: (()=>{ try{ return a["config-json"] ? JSON.parse(a["config-json"]) : {} }catch(e){ return {} } })(),
    statebag: !!a.statebag,
    db: (a.db || "oxmysql").toLowerCase(),
    sql: !!a.sql,
    dbPrefix: a["db-prefix"] || "",
    runSqlOnStart: !!a["run-sql-on-start"],
    cb: {
      qb: list(a.cb||"").includes("qb"),
      esx: list(a.cb||"").includes("esx"),
      ox: list(a.cb||"").includes("ox")
    },
    callbackName: a["callback-name"] || ""
  }
  const out = resolve(process.cwd(), name)
  ensureDir(out)
  write(resolve(out, "fxmanifest.lua"), tplFx(o))
  write(resolve(out, "config.lua"), tplConfig(o))
  write(resolve(out, "client/"+o.clientFile), tplClient(o))
  write(resolve(out, "server/"+o.serverFile), tplServer(o))
  if (o.sql){
    write(resolve(out, "server/sql.lua"), tplServerSql(o))
    ensureDir(resolve(out, "sql"))
    const schema = "CREATE TABLE IF NOT EXISTS " + o.dbPrefix + "demo_logs (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  identifier VARCHAR(64) NOT NULL,\n  action VARCHAR(64) NOT NULL,\n  data TEXT,\n  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n"
    write(resolve(out, "sql/schema.sql"), schema)
    ensureDir(resolve(out, "migrations"))
    const mig = "CREATE TABLE IF NOT EXISTS " + o.dbPrefix + "demo_extra (\n  id INT AUTO_INCREMENT PRIMARY KEY,\n  note VARCHAR(255) NOT NULL,\n  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n"
    write(resolve(out, "migrations/001_init.sql"), mig)
  }
  if (o.modules){
    write(resolve(out, "client/modules/example.lua"), "local M = {}\nreturn M\n")
    write(resolve(out, "server/modules/example.lua"), "local M = {}\nreturn M\n")
  }
  if (o.useOxTarget){
    write(resolve(out, "client/target.lua"), "CreateThread(function() end)\n")
    if (!o.dependencies.includes("ox_target")) o.dependencies.push("ox_target")
  }
  if (o.nui){
    write(resolve(out, "web/index.html"), webHtml(o))
    write(resolve(out, "web/style.css"), webCss())
    write(resolve(out, "web/app.js"), webJs())
  }
  const locs = o.locales.length ? o.locales : ["cs","en"]
  ensureDir(resolve(out, "locales"))
  for (const l of locs) write(resolve(out, `locales/${l}.lua`), tplLocale())
  if (a.license) write(resolve(out, "LICENSE"), String(a.license))
  console.log("Created", out)
}
main()
