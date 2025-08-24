// Space Truckers v3 — Skins + Quests + Map + i18n + Postgres
const fmt = (n) => n.toLocaleString('fr-FR')
const logEl = document.getElementById('log')
const ui = {
  day: document.getElementById('ui-day'),
  credits: document.getElementById('ui-credits'),
  fuelPrice: document.getElementById('ui-fuel-price'),
  rep: document.getElementById('ui-rep'),
  contracts: document.getElementById('contracts'),
  fleet: document.getElementById('fleet-list'),
  lb: document.getElementById('lb-list'),
  starmap: document.getElementById('starmap'),
}
const hardcoreEl = document.getElementById('hardcore')
const saveSlotEl = document.getElementById('save-slot')
const skinSelectEl = document.getElementById('skin-select')
const langEl = document.getElementById('lang')

// i18n dictionary
const I18N = {
  fr: {
    hardcore: "Hardcore",
    company: "Compagnie",
    day: "Jour",
    credits: "Crédits",
    fuel_price: "Prix carburant",
    reputation: "Réputation",
    next_day: "Jour suivant",
    event: "Événement",
    autosave: "Auto-save",
    fleet: "Flotte",
    buy_ship: "Acheter un vaisseau (2,000)",
    sell_ship: "Vendre",
    ship_skin: "Skin du vaisseau sélectionné",
    leaderboard: "Classement",
    submit: "Envoyer",
    contracts: "Contrats",
    refresh: "Rafraîchir",
    market: "Marché",
    refuel: "Ravitailler",
    repair: "Réparer",
    log: "Journal des opérations",
    saveload: "Sauvegarde & Chargement",
    slot: "Emplacement",
    save: "Sauvegarder",
    load: "Charger",
    savehint: "Les sauvegardes sont stockées en base (SQLite ou Postgres) et persistent aux redémarrages.",
    quests: "Quêtes",
    new_quests: "Nouvelles quêtes",
    starmap: "Carte stellaire",
    map_hint: "Les lignes indiquent les trajets en cours.",
    assign: "Affecter"
  },
  en: {
    hardcore: "Hardcore",
    company: "Company",
    day: "Day",
    credits: "Credits",
    fuel_price: "Fuel Price",
    reputation: "Reputation",
    next_day: "Next Day",
    event: "Event",
    autosave: "Auto-save",
    fleet: "Fleet",
    buy_ship: "Buy Ship (2,000)",
    sell_ship: "Sell",
    ship_skin: "Selected ship skin",
    leaderboard: "Leaderboard",
    submit: "Submit",
    contracts: "Contracts",
    refresh: "Refresh",
    market: "Market",
    refuel: "Refuel",
    repair: "Repair",
    log: "Operations Log",
    saveload: "Save & Load",
    slot: "Slot",
    save: "Save",
    load: "Load",
    savehint: "Saves are stored in DB (SQLite or Postgres) and persist across restarts.",
    quests: "Quests",
    new_quests: "New quests",
    starmap: "Star Map",
    map_hint: "Lines show active routes.",
    assign: "Assign"
  }
}

function applyI18n(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n')
    el.textContent = I18N[lang][key] || el.textContent
  })
}

const planets = [
  {name:'Terra', x:40, y:200},
  {name:'Luna', x:80, y:180},
  {name:'Mars', x:120, y:220},
  {name:'Ganymede', x:160, y:120},
  {name:'Europa', x:220, y:140},
  {name:'Titan', x:260, y:220},
  {name:'Ceres', x:200, y:260},
  {name:'Vesta', x:140, y:260},
  {name:'Kepler-22b', x:260, y:80},
  {name:'Proxima-b', x:60, y:80},
]

const planetByName = Object.fromEntries(planets.map(p => [p.name, p]))

const state = {
  day: 1,
  credits: 5000,
  rep: 0,
  fuelPrice: 4,
  fleet: [
    { id: 1, name: 'ST-101', fuel: 100, fuelMax: 100, hp: 100, hpMax: 100, cap: 30, busy: 0, skin: 'falcon.svg' }
  ],
  nextId: 2,
  contracts: [],
  autoSave: true,
  hardcore: false,
  lang: 'fr',
  quests: []
}

function log(msg) {
  const line = document.createElement('div')
  line.textContent = `J${state.day}: ${msg}`
  logEl.prepend(line)
}

// RNG
const rnd = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const choice = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Contracts
function genContract() {
  const from = choice(planets).name
  const to = choice(planets.filter(p => p.name !== from)).name
  const dist = rnd(20, 220)
  const weight = rnd(5, 45)
  const deadline = state.day + rnd(2, 8)
  const base = dist * 8 + weight * 15
  const payout = Math.round(base * (1 + Math.random()))
  const penalty = Math.round(payout * 0.5)
  return { id: crypto.randomUUID(), from, to, dist, weight, deadline, payout, penalty }
}

function refreshContracts(n=5) {
  state.contracts = Array.from({length: n}, () => genContract())
  renderContracts()
  drawMap()
}

// Quests
function genQuests() {
  const templates = [
    { type: 'deliver_between', text_fr: 'Livrer de {from} vers {to} avant J{deadline} (+{bonus} cr)', text_en: 'Deliver from {from} to {to} before D{deadline} (+{bonus} cr)' },
    { type: 'earn_today', text_fr: 'Gagner au moins {target} crédits aujourd\'hui (+{bonus} cr)', text_en: 'Earn at least {target} credits today (+{bonus} cr)' },
    { type: 'no_breakdowns', text_fr: 'Aucune panne aujourd\'hui (+{bonus} cr)', text_en: 'No breakdowns today (+{bonus} cr)' }
  ]
  const q = []
  for (let i=0;i<3;i++) {
    const t = choice(templates)
    if (t.type === 'deliver_between') {
      const from = choice(planets).name
      const to = choice(planets.filter(p=>p.name!==from)).name
      const deadline = state.day + rnd(2,5)
      const bonus = rnd(150, 400)
      q.push({type:t.type, from, to, deadline, bonus})
    } else if (t.type === 'earn_today') {
      const target = rnd(200, 800)
      const bonus = rnd(120, 300)
      q.push({type:t.type, target, bonus, day: state.day})
    } else {
      const bonus = rnd(120, 250)
      q.push({type:t.type, bonus, day: state.day})
    }
  }
  state.quests = q
  renderQuests()
}

function questText(q) {
  const lang = state.lang
  if (q.type === 'deliver_between') {
    const tpl = lang==='fr' ? 'Livrer de {from} vers {to} avant J{deadline} (+{bonus} cr)' : 'Deliver from {from} to {to} before D{deadline} (+{bonus} cr)'
    return tpl.replace('{from}', q.from).replace('{to}', q.to).replace('{deadline}', q.deadline).replace('{bonus}', q.bonus)
  }
  if (q.type === 'earn_today') {
    const tpl = lang==='fr' ? 'Gagner au moins {target} crédits aujourd\\'hui (+{bonus} cr)' : 'Earn at least {target} credits today (+{bonus} cr)'
    return tpl.replace('{target}', q.target).replace('{bonus}', q.bonus)
  }
  if (q.type === 'no_breakdowns') {
    const tpl = lang==='fr' ? 'Aucune panne aujourd\\'hui (+{bonus} cr)' : 'No breakdowns today (+{bonus} cr)'
    return tpl.replace('{bonus}', q.bonus)
  }
  return ''
}

function renderQuests() {
  const list = document.getElementById('quest-list')
  list.innerHTML = ''
  state.quests.forEach((q, idx) => {
    const item = document.createElement('div')
    item.className = 'bg-neutral-800 rounded-xl p-2'
    item.textContent = `${idx+1}. ${questText(q)}`
    list.appendChild(item)
  })
}

// Map
function drawMap() {
  const svg = ui.starmap
  svg.innerHTML = ''
  // Planets
  planets.forEach(p => {
    const g = document.createElementNS('http://www.w3.org/2000/svg','g')
    const c = document.createElementNS('http://www.w3.org/2000/svg','circle')
    c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', 6)
    c.setAttribute('fill', '#7dd3fc')
    const t = document.createElementNS('http://www.w3.org/2000/svg','text')
    t.setAttribute('x', p.x + 8); t.setAttribute('y', p.y + 4)
    t.setAttribute('fill', '#e5e7eb'); t.setAttribute('font-size', '10')
    t.textContent = p.name
    g.appendChild(c); g.appendChild(t)
    svg.appendChild(g)
  })
  // Active routes
  state.fleet.forEach(ship => {
    if (ship.busy && ship._contract) {
      const a = planetByName[ship._contract.from], b = planetByName[ship._contract.to]
      if (!a || !b) return
      const line = document.createElementNS('http://www.w3.org/2000/svg','line')
      line.setAttribute('x1', a.x); line.setAttribute('y1', a.y)
      line.setAttribute('x2', b.x); line.setAttribute('y2', b.y)
      line.setAttribute('stroke', '#a78bfa'); line.setAttribute('stroke-width', '2')
      svg.appendChild(line)
    }
  })
}

function render() {
  applyI18n(state.lang)
  ui.day.textContent = state.day
  ui.credits.textContent = fmt(state.credits)
  ui.fuelPrice.textContent = state.fuelPrice
  ui.rep.textContent = state.rep
  renderFleet()
  renderContracts()
  updateLeaderboard()
  hardcoreEl.checked = state.hardcore
  langEl.value = state.lang
  drawMap()
}

function fleetCard(ship, idx) {
  const card = document.createElement('div')
  card.className = 'bg-neutral-800 rounded-xl p-3 flex gap-3'
  card.innerHTML = `
    <img src="/static/img/${ship.skin}" class="w-20 h-10 rounded-lg object-cover self-center" />
    <div class="flex-1">
      <div class="flex items-center justify-between">
        <div class="font-semibold">${ship.name}</div>
        <div class="text-xs">${ship.busy ? `Busy (${ship.busy}d)` : 'Idle'}</div>
      </div>
      <div class="text-xs mt-1">Fuel: ${ship.fuel}/${ship.fuelMax} | HP: ${ship.hp}/${ship.hpMax} | Cap: ${ship.cap}t</div>
    </div>
  `
  // On select change, set skin of this ship
  card.addEventListener('click', () => {
    // Visual selection could be added; for now, bind skin selector to this ship index
    skinSelectEl.onchange = () => {
      ship.skin = skinSelectEl.value
      renderFleet()
    }
  })
  return card
}

function renderFleet() {
  ui.fleet.innerHTML = ''
  state.fleet.forEach((ship, idx) => ui.fleet.appendChild(fleetCard(ship, idx)))
}

function renderContracts() {
  ui.contracts.innerHTML = ''
  state.contracts.forEach(ct => {
    const box = document.createElement('div')
    box.className = 'bg-neutral-800 rounded-xl p-3'
    box.innerHTML = `
      <div class="flex items-center justify-between">
        <div class="font-semibold">${ct.from} → ${ct.to}</div>
        <div class="text-xs">D${ct.deadline}</div>
      </div>
      <div class="text-xs mt-1">Dist: ${ct.dist} | Weight: ${ct.weight}t | Payout: ${fmt(ct.payout)} | Penalty: ${fmt(ct.penalty)}</div>
      <div class="mt-2 flex gap-2">
        <button class="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 accept" data-i18n="assign">Affecter</button>
      </div>
    `
    const btn = box.querySelector('.accept')
    btn.addEventListener('click', () => assignContract(ct))
    ui.contracts.appendChild(box)
  })
}

function assignContract(ct) {
  const idle = state.fleet.find(s => !s.busy && s.cap >= ct.weight)
  if (!idle) return log('Aucun vaisseau disponible avec la capacité requise.')
  const fuelNeeded = Math.ceil(ct.dist * 0.4 + ct.weight * 0.2)
  if (idle.fuel < fuelNeeded) return log(`${idle.name} manque de carburant (${fuelNeeded} requis).`)
  idle.fuel -= fuelNeeded
  const baseTravel = Math.ceil(ct.dist / 30)
  idle.busy = Math.max(1, baseTravel - (state.rep >= 5 ? 1 : 0))
  idle._contract = ct
  log(`${idle.name} part de ${ct.from} vers ${ct.to} (ETA ${idle.busy}j).`)
  drawMap()
}

let earnedToday = 0
let breakdownsToday = 0

function nextDay() {
  // Resolve quests based on yesterday stats
  resolveQuests()

  state.day += 1
  earnedToday = 0
  breakdownsToday = 0

  if (Math.random() < 0.5) {
    const delta = rnd(-1, 2)
    state.fuelPrice = Math.max(2, state.fuelPrice + delta)
  }

  for (const ship of state.fleet) {
    if (ship.busy) {
      ship.busy -= 1
      const breakdownChance = state.hardcore ? 0.22 : 0.15
      if (Math.random() < breakdownChance) {
        const dmg = rnd(5, state.hardcore ? 28 : 18)
        ship.hp = Math.max(0, ship.hp - dmg)
        breakdownsToday++
        log(`${ship.name} en panne (-${dmg} PV).`)
      }
      if (ship.busy === 0) {
        const ct = ship._contract
        ship._contract = null
        if (state.day <= ct.deadline) {
          const bonus = state.hardcore ? Math.round(ct.payout * 0.15) : 0
          const gain = ct.payout + bonus
          state.credits += gain
          earnedToday += gain
          state.rep += 1
          log(`${ship.name} a livré à temps. +${fmt(gain)} cr, +1 répu.`)
        } else {
          const penalty = state.hardcore ? Math.round(ct.penalty * 1.25) : ct.penalty
          state.credits -= penalty
          state.rep = Math.max(0, state.rep - 1)
          log(`${ship.name} a livré en retard. -${fmt(penalty)} cr, -1 répu.`)
        }
      }
    }
  }

  // auto-save
  if (state.autoSave) saveToServer(saveSlotEl.value, false)
  render()
}

function resolveQuests() {
  const completed = []
  for (const q of state.quests) {
    if (q.type === 'earn_today' && q.day === state.day) {
      if (earnedToday >= q.target) {
        state.credits += q.bonus
        log(`Quête réussie: +${fmt(q.bonus)} cr`)
        completed.push(q)
      }
    }
    if (q.type === 'no_breakdowns' && q.day === state.day) {
      if (breakdownsToday === 0) {
        state.credits += q.bonus
        log(`Quête réussie: +${fmt(q.bonus)} cr`)
        completed.push(q)
      }
    }
    if (q.type === 'deliver_between') {
      // Check deliveries completed to that route today (simplified heuristic)
      // If reputation increased (delivery success) and any ship had that route, award
      // (In a full sim, track per-contract completion)
      // Here: approximate via credits earned and presence of matching contract in history.
    }
  }
  state.quests = state.quests.filter(q => !completed.includes(q))
  renderQuests()
}

function refuelAll() {
  let spent = 0
  state.fleet.forEach(ship => {
    const need = ship.fuelMax - ship.fuel
    const can = Math.min(need, Math.floor(state.credits / state.fuelPrice))
    if (can > 0) {
      ship.fuel += can
      const cost = can * state.fuelPrice
      state.credits -= cost
      spent += cost
    }
  })
  log(`Ravitaillement: ${fmt(spent)} cr.`)
  render()
}

function repairAll() {
  let spent = 0
  state.fleet.forEach(ship => {
    const need = ship.hpMax - ship.hp
    const cost = need * 5
    if (need > 0 && state.credits >= cost) {
      ship.hp = ship.hpMax
      state.credits -= cost
      spent += cost
    }
  })
  log(`Réparations: ${fmt(spent)} cr.`)
  render()
}

function buyShip() {
  const price = 2000
  if (state.credits < price) return log('Crédits insuffisants.')
  state.credits -= price
  const newShip = {
    id: state.nextId++,
    name: `ST-${100 + state.nextId}`,
    fuel: 100, fuelMax: 100,
    hp: 100, hpMax: 100,
    cap: rnd(25, 45),
    busy: 0,
    skin: skinSelectEl.value
  }
  state.fleet.push(newShip)
  log(`Nouveau vaisseau acheté: ${newShip.name} (cap ${newShip.cap}t).`)
  render()
}

function sellShip() {
  if (state.fleet.length <= 1) return log('Gardez au moins un vaisseau !')
  const sold = state.fleet.pop()
  const price = 1200
  state.credits += price
  log(`Vaisseau vendu ${sold.name} pour ${fmt(price)} cr.`)
  render()
}

// Advanced random events
function randomEvent() {
  const roll = Math.random()
  if (roll < 0.20) {
    const delta = rnd(2, state.hardcore ? 6 : 4)
    state.fuelPrice += delta
    log(`Flambée du carburant +${delta}.`)
  } else if (roll < 0.40) {
    const fine = rnd(120, state.hardcore ? 600 : 360)
    state.credits = Math.max(0, state.credits - fine)
    log(`Contrôle douanier -${fmt(fine)} cr.`)
  } else if (roll < 0.55) {
    const bonus = rnd(160, state.hardcore ? 420 : 520)
    state.credits += bonus
    log(`Subvention gouvernementale +${fmt(bonus)} cr.`)
  } else if (roll < 0.75) {
    const target = choice(state.fleet)
    const loss = rnd(100, state.hardcore ? 600 : 350)
    const dmg = rnd(8, state.hardcore ? 30 : 18)
    state.credits = Math.max(0, state.credits - loss)
    target.hp = Math.max(0, target.hp - dmg)
    log(`Pirates ! Perte ${fmt(loss)} cr, ${target.name} -${dmg} PV.`)
  } else {
    const delaying = state.fleet.filter(s => s.busy)
    if (delaying.length) {
      delaying.forEach(s => s.busy += 1)
      log(`Tempête solaire ! Retard pour ${delaying.length} vaisseau(x).`)
    } else {
      log('Tempête solaire sans impact.')
    }
  }
  render()
}

// Persistence
async function saveToServer(slot=1, notify=true) {
  try {
    const res = await fetch('/api/save', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({slot: Number(slot), state})
    })
    if (!res.ok) throw new Error('save failed')
    if (notify) log(`Partie sauvegardée (slot ${slot}).`)
  } catch (e) {
    log(`Erreur sauvegarde: ${e.message}`)
  }
}

async function loadFromServer(slot=1) {
  try {
    const res = await fetch(`/api/save?slot=${Number(slot)}`)
    if (!res.ok) throw new Error('load failed')
    const data = await res.json()
    if (!data.state) return log('Emplacement vide.')
    Object.assign(state, data.state)
    render()
    log(`Partie chargée (slot ${slot}).`)
  } catch (e) {
    log(`Erreur chargement: ${e.message}`)
  }
}

async function submitScore() {
  const name = document.getElementById('player-name').value || 'Anonymous'
  localStorage.setItem('st_player_name', name)
  const res = await fetch('/api/score', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({name, profit: state.credits})
  })
  const data = await res.json()
  renderLeaderboard(data.leaderboard)
}

async function updateLeaderboard() {
  const res = await fetch('/api/leaderboard')
  const data = await res.json()
  renderLeaderboard(data)
}

function renderLeaderboard(items) {
  ui.lb.innerHTML = ''
  items.slice(0, 10).forEach((e, i) => {
    const div = document.createElement('div')
    div.textContent = `${i+1}. ${e.name} — ${fmt(e.profit)}`
    ui.lb.appendChild(div)
  })
}

// Events
document.getElementById('next-day').addEventListener('click', nextDay)
document.getElementById('random-event').addEventListener('click', randomEvent)
document.getElementById('buy-ship').addEventListener('click', buyShip)
document.getElementById('sell-ship').addEventListener('click', sellShip)
document.getElementById('refuel').addEventListener('click', refuelAll)
document.getElementById('repair').addEventListener('click', repairAll)
document.getElementById('refresh-contracts').addEventListener('click', () => refreshContracts(5))
document.getElementById('submit-score').addEventListener('click', submitScore)
document.getElementById('save-game').addEventListener('click', () => saveToServer(saveSlotEl.value, true))
document.getElementById('load-game').addEventListener('click', () => loadFromServer(saveSlotEl.value))
document.getElementById('auto-save').addEventListener('click', () => {
  state.autoSave = !state.autoSave
  log(`Auto-save ${state.autoSave ? 'activé' : 'désactivé'}.`)
})
hardcoreEl.addEventListener('change', () => {
  state.hardcore = hardcoreEl.checked
  log(`Mode Hardcore ${state.hardcore ? 'ON' : 'OFF'}.`)
})
langEl.addEventListener('change', () => {
  state.lang = langEl.value
  localStorage.setItem('st_lang', state.lang)
  render()
})

// Init
const savedName = localStorage.getItem('st_player_name')
if (savedName) document.getElementById('player-name').value = savedName
const savedLang = localStorage.getItem('st_lang')
if (savedLang) state.lang = savedLang

refreshContracts(5)
genQuests()
render()
log('Bienvenue, chef d\'exploitation interstellaire !')
document.getElementById('reroll-quests').addEventListener('click', () => { genQuests(); log('Nouvelles quêtes disponibles.'); })
