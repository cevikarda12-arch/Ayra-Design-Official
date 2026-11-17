// Ayra Design - basit, bağımlılıksız JSON veritabanı
// Atomik yazma (tmp + rename) ve gecikmeli kaydetme ile çalışır.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function uid(prefix = '') {
  return prefix + crypto.randomBytes(8).toString('hex');
}

class DB {
  constructor(file) {
    this.file = file;
    this.data = {};
    this._timer = null;
    this._dirty = false;
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.file)) {
        this.data = JSON.parse(fs.readFileSync(this.file, 'utf8')) || {};
      }
    } catch (e) {
      console.error('[db] Veritabanı okunamadı, yedekten deneniyor:', e.message);
      const bak = this.file + '.bak';
      if (fs.existsSync(bak)) {
        try { this.data = JSON.parse(fs.readFileSync(bak, 'utf8')); } catch { this.data = {}; }
      }
    }
  }

  col(name) {
    if (!Array.isArray(this.data[name])) this.data[name] = [];
    return this.data[name];
  }

  meta(key, value) {
    if (!this.data._meta) this.data._meta = {};
    if (value === undefined) return this.data._meta[key];
    this.data._meta[key] = value;
    this.save();
    return value;
  }

  get(name, id) {
    return this.col(name).find((x) => x.id === id) || null;
  }

  find(name, fn) {
    return this.col(name).filter(fn);
  }

  findOne(name, fn) {
    return this.col(name).find(fn) || null;
  }

  insert(name, obj) {
    const now = Date.now();
    const item = { id: obj.id || uid(), createdAt: now, updatedAt: now, ...obj };
    this.col(name).push(item);
    this.save();
    return item;
  }

  update(name, id, patch) {
    const item = this.get(name, id);
    if (!item) return null;
    Object.assign(item, patch, { id: item.id, updatedAt: Date.now() });
    this.save();
    return item;
  }

  remove(name, id) {
    const arr = this.col(name);
    const i = arr.findIndex((x) => x.id === id);
    if (i === -1) return null;
    const [item] = arr.splice(i, 1);
    this.save();
    return item;
  }

  removeWhere(name, fn) {
    const arr = this.col(name);
    const keep = arr.filter((x) => !fn(x));
    const removed = arr.length - keep.length;
    this.data[name] = keep;
    if (removed) this.save();
    return removed;
  }

  save() {
    this._dirty = true;
    if (this._timer) return;
    this._timer = setTimeout(() => this.flush(), 250);
  }

  flush() {
    clearTimeout(this._timer);
    this._timer = null;
    if (!this._dirty) return;
    this._dirty = false;
    const json = JSON.stringify(this.data);
    const tmp = this.file + '.tmp';
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      if (fs.existsSync(this.file)) {
        try { fs.copyFileSync(this.file, this.file + '.bak'); } catch {}
      }
      fs.writeFileSync(tmp, json);
      fs.renameSync(tmp, this.file);
    } catch (e) {
      console.error('[db] Kaydetme hatası:', e.message);
    }
  }

  replaceAll(data) {
    this.data = data || {};
    this._dirty = true;
    this.flush();
  }
}

module.exports = { DB, uid };
