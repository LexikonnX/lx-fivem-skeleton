# FiveM Script skeleton generator
> Ultimate FiveM Resource Scaffold Generator  
> Supports **QBcore**, **ESX**, and **OX_LIB** with optional NUI, SQL, callbacks, exports, locales, keybinds, modules, and much more.  
>  
> 🦊 byAlex – [GitHub Release](https://github.com/LexikonnX/lx-fivem-skeleton/releases/tag/v1.0)

## ⚙️ Overview
`lx-fivem-skeleton-generator-pro` is a powerful Node.js CLI tool that instantly scaffolds a **complete FiveM resource**.  
It can automatically generate structure, config, client/server scripts, NUI, SQL files, callbacks, exports, locales, and much more — all configured via arguments.

Perfect for developers using **QBcore**, **ESX**, or **OX_LIB** frameworks.

## 🚀 Installation
```bash
npm install
```
Then run directly:
```bash
node bin/lxgen.js [arguments...]
```
Or make it global:
```bash
npm link
lxgen --help
```

## 🧩 Example Usage
```bash
node bin/lxgen.js   --name lx-demo   --framework qb   --nui   --commands   --events client,server   --exports client:open,server:save   --locales cs,en   --default-locale cs   --use-ox-lib   --use-ox-target   --use-ox-inventory   --item pager   --dependencies qb-core,ox_lib,ox_target,oxmysql   --keybind F3   --modules   --author byAlex   --version 1.0.0   --description "Demo resource"   --config-json '{"Debug":true,"SomeNumber":5}'   --sql   --db oxmysql   --db-prefix lx_   --run-sql-on-start   --cb qb,esx,ox   --callback-name lx-demo:getData
```

## 📂 Generated Structure
```
lx-demo/
├── fxmanifest.lua
├── config.lua
├── client/
│   ├── main.lua
│   └── modules/
│       └── example.lua
├── server/
│   ├── main.lua
│   ├── sql.lua
│   └── modules/
│       └── example.lua
├── web/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── locales/
│   ├── cs.lua
│   └── en.lua
├── sql/
│   └── schema.sql
├── migrations/
│   └── 001_init.sql
└── LICENSE
```

## 🧠 Arguments & Options
### 🏷️ Basic Info
| Argument | Description | Example |
|-----------|--------------|----------|
| `--name` | Resource folder and internal name | `--name lx-demo` |
| `--framework` | Framework selection (`qb`, `esx`, `ox`) | `--framework qb` |
| `--fx` | fxmanifest version (default `cerulean`) | `--fx cerulean` |
| `--lua54` | Enable Lua 5.4 syntax (default true) | `--lua54 false` |
| `--author` | Author name | `--author byAlex` |
| `--version` | Version number | `--version 1.0.0` |
| `--description` | Short description of resource | `"Demo resource"` |
| `--license` | Text to include in LICENSE file | `"MIT"` |

### 🧱 Structure & Config
| Argument | Description |
|-----------|-------------|
| `--config-json` | JSON object of custom Config values |
| `--modules` | Adds `client/modules` & `server/modules` with example.lua |
| `--client-file` | Main client filename (default `main.lua`) |
| `--server-file` | Main server filename (default `main.lua`) |

### 🧠 Framework Features
| Argument | Description |
|-----------|-------------|
| `--commands` | Adds base commands (`/lx-demo` etc.) |
| `--events client,server` | Adds event stubs for both sides |
| `--exports client:foo,server:bar` | Adds sample exports and server_exports |
| `--statebag` | Adds basic StateBagChangeHandler |
| `--keybind F3` | Registers `RegisterKeyMapping` for toggling UI |

### 🌐 NUI
| Argument | Description |
|-----------|-------------|
| `--nui` | Generates full NUI scaffold (HTML/CSS/JS) |
| `--use-ox-lib` | Adds `@ox_lib/init.lua` to shared_scripts |
| `--use-ox-target` | Adds client/target.lua + dependency |
| `--use-ox-inventory` | Adds usable item registration logic |
| `--item pager` | Defines usable item name for ox_inventory |

### 🌍 Locales
| Argument | Description |
|-----------|-------------|
| `--locales cs,en` | List of locales to generate |
| `--default-locale cs` | Default language to load |

### 💾 Database & SQL
| Argument | Description |
|-----------|-------------|
| `--sql` | Generates `server/sql.lua` and SQL files |
| `--db oxmysql` | Select database adapter (`oxmysql`, `ghmatti`, `mysqlasync`) |
| `--db-prefix lx_` | Prefix for all generated SQL tables |
| `--run-sql-on-start` | Executes `sql/schema.sql` at resource start |
| `--dependencies oxmysql` | Automatically adds to `fxmanifest` dependencies |

### 🔁 Callbacks
| Argument | Description |
|-----------|-------------|
| `--cb qb,esx,ox` | Generate callback handlers for multiple frameworks |
| `--callback-name myres:getData` | Callback name (used by all selected frameworks) |

### 🔗 Exports & Provides
| Argument | Description |
|-----------|-------------|
| `--exports client:foo,server:bar` | Creates example exports |
| `--provides resourceName` | Adds provides clause to manifest |

### 🧩 Dependencies
| Argument | Description |
|-----------|-------------|
| `--dependencies qb-core,ox_lib,ox_target,oxmysql` | Comma-separated list of required resources |

## 🧰 SQL Integration
When using `--sql`, the tool will:
- Create **server/sql.lua** with `DB.exec` and `DB.scalar` functions
- Add **sql/schema.sql** and **migrations/001_init.sql**
- Optionally execute schema automatically with `--run-sql-on-start`
- Auto-include `oxmysql`, `ghmattimysql`, or `mysql-async` adapters

## 🔥 Callbacks Integration
- `--cb qb` → creates `QBCore.Functions.CreateCallback`
- `--cb esx` → creates `ESX.RegisterServerCallback`
- `--cb ox` → creates `lib.callback.register`

## 🖥️ NUI Integration
When using `--nui`, the generator creates:
- `web/index.html`, `web/style.css`, `web/app.js`
- Includes `ui_page` and `files` in `fxmanifest.lua`
- Adds basic JS postMessage + close event

## 🧾 Example Output Snippets
**config.lua**
```lua
Config = {}
Config.Framework = "qb"
Config.ResourceName = "lx-demo"
Config.DB = "oxmysql"
Config.DBPrefix = "lx_"
Config.DBInit = true
Core = {}
Locales = {}
ActiveLocale = Config.Locale
```
**server/sql.lua**
```lua
local DB = {}
if Config.DB == 'oxmysql' then
  function DB.exec(sql, params, cb) exports.oxmysql:execute(sql, params or {}, cb) end
end
```

## 💡 Tips
- You can mix arguments freely — the generator automatically builds only what you enable.
- Works on **Windows, macOS, and Linux**.
- Supports Node.js **v18+**.

## 🔗 Release
📦 **Download latest release:**  
👉 [lx-fivem-skeleton-generator-pro.zip](https://github.com/LexikonnX/lx-fivem-docs/releases/tag/last)
