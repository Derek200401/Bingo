const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const USED_FILE = path.join(__dirname, 'used-cards.json');

let usedCards = new Set();
try {
  if (fs.existsSync(USED_FILE)) {
    usedCards = new Set(JSON.parse(fs.readFileSync(USED_FILE, 'utf8')));
  }
} catch (e) {
  console.error('Could not load used-cards.json:', e.message);
}

let saveTimeout = null;
function saveUsedCards() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    fs.writeFile(USED_FILE, JSON.stringify([...usedCards]), (err) => {
      if (err) console.error('Save failed:', err.message);
    });
  }, 200);
}

const COLS = [
  { min: 1,  max: 15 }, { min: 16, max: 30 }, { min: 31, max: 45 },
  { min: 46, max: 60 }, { min: 61, max: 75 },
];

function range(min, max) {
  const a = [];
  for (let i = min; i <= max; i++) a.push(i);
  return a;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateCard() {
  return COLS.map(c => shuffle(range(c.min, c.max)).slice(0, 5));
}

function fingerprint(card) {
  const parts = [];
  for (let ci = 0; ci < 5; ci++) {
    for (let ri = 0; ri < 5; ri++) {
      parts.push(ci === 2 && ri === 2 ? 'FREE' : card[ci][ri]);
    }
  }
  return parts.join('|');
}

app.post('/api/card', (req, res) => {
  let card, fp, attempts = 0;
  do {
    card = generateCard();
    fp = fingerprint(card);
    attempts++;
  } while (usedCards.has(fp) && attempts < 2000);

  if (usedCards.has(fp)) {
    return res.status(503).json({ error: 'Hindi makagawa ng unique card ngayon. Subukan ulit.' });
  }

  usedCards.add(fp);
  saveUsedCards();
  res.json({ card, totalUsed: usedCards.size });
});

app.use(express.static(path.join(__dirname, 'public')));
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));