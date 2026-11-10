const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const siftMod = require('sift');
const sift = siftMod.default || siftMod;
const { ObjectId } = require('bson');
const mongoose = require('mongoose');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'local_db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function normalizeQuery(query) {
  if (!query || typeof query !== 'object') return {};
  const normalized = {};
  for (const [key, value] of Object.entries(query)) {
    if (value && typeof value === 'object' && value.toString && !Array.isArray(value) && !(value instanceof RegExp) && !(value instanceof Date)) {
      if (value._bsontype === 'ObjectID' || value.constructor?.name === 'ObjectId') {
        normalized[key] = value.toString();
        continue;
      }
    }
    if (key === '_id' || key === 'ownerId' || key === 'recipientId' || key === 'userId' || key === 'conversationId') {
      if (typeof value === 'string') {
        normalized[key] = value;
        continue;
      }
      if (value && value._id) {
        normalized[key] = value._id.toString();
        continue;
      }
    }
    normalized[key] = value;
  }
  return normalized;
}

class LocalDoc {
  constructor(data, collectionName, store) {
    this._data = { ...data };
    this._collectionName = collectionName;
    this._store = store;

    if (!this._data._id) {
      this._data._id = new ObjectId().toString();
    } else if (typeof this._data._id !== 'string') {
      this._data._id = this._data._id.toString();
    }

    if (!this._data.createdAt) this._data.createdAt = new Date();
    if (!this._data.updatedAt) this._data.updatedAt = new Date();

    Object.assign(this, this._data);

    // Ensure _id is a valid ObjectId with full serialization support
    const idStr = this._data._id;
    try {
      this._id = new ObjectId(idStr);
    } catch (e) {
      this._id = new ObjectId();
      this._data._id = this._id.toString();
    }
  }

  get id() {
    return this._data._id;
  }

  async comparePassword(candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
  }

  isModified() {
    return true;
  }

  toObject() {
    return { ...this._data, _id: this._data._id, id: this._data._id };
  }

  toJSON() {
    return this.toObject();
  }

  async save() {
    // Copy updated properties back to _data
    for (const key of Object.keys(this)) {
      if (!key.startsWith('_') && typeof this[key] !== 'function') {
        this._data[key] = this[key];
      }
    }
    this._data.updatedAt = new Date();
    this._store.saveDoc(this._collectionName, this._data);
    return this;
  }
}

class LocalQuery {
  constructor(executor) {
    this._executor = executor;
    this._sortCriteria = null;
    this._limitCount = null;
    this._skipCount = 0;
    this._selectedFields = null;
  }

  sort(criteria) {
    this._sortCriteria = criteria;
    return this;
  }

  limit(count) {
    this._limitCount = count;
    return this;
  }

  skip(count) {
    this._skipCount = count;
    return this;
  }

  select(fields) {
    this._selectedFields = fields;
    return this;
  }

  populate() {
    return this;
  }

  async exec() {
    let result = await this._executor();
    if (Array.isArray(result)) {
      if (this._sortCriteria) {
        result.sort((a, b) => {
          for (const [key, direction] of Object.entries(this._sortCriteria)) {
            const valA = a[key] instanceof Date ? a[key].getTime() : a[key];
            const valB = b[key] instanceof Date ? b[key].getTime() : b[key];
            if (valA < valB) return direction === -1 || direction === 'desc' ? 1 : -1;
            if (valA > valB) return direction === -1 || direction === 'desc' ? -1 : 1;
          }
          return 0;
        });
      }
      if (this._skipCount) {
        result = result.slice(this._skipCount);
      }
      if (this._limitCount) {
        result = result.slice(0, this._limitCount);
      }
    }
    return result;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

class LocalStore {
  constructor() {
    this.data = {
      users: [],
      userpreferences: [],
      trips: [],
      projects: [],
      tasks: [],
      documents: [],
      documentchunks: [],
      conversations: [],
      messages: [],
      notifications: []
    };
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.data = { ...this.data, ...parsed };
      } else {
        this.seedInitial();
        this.persist();
      }
    } catch (err) {
      console.warn('[LocalStore] Error reading local_db.json, reinitializing:', err.message);
      this.seedInitial();
      this.persist();
    }
  }

  seedInitial() {
    const demoId = '663e10000000000000000001';
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('demopass123', salt);

    this.data.users = [
      {
        _id: demoId,
        name: 'Alex Mercer',
        email: 'demo@lifepilot.ai',
        password: hashedPassword,
        bio: 'Explorer, Product Builder & AI Enthusiast',
        role: 'user',
        theme: 'dark',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    this.data.userpreferences = [
      {
        _id: '663e20000000000000000001',
        ownerId: demoId,
        defaultCurrency: 'INR',
        travelBudgetStyle: 'Standard',
        defaultTravelInterests: ['Tech', 'Culture', 'Food'],
        aiProviderPreference: 'auto',
        notificationsEnabled: true,
        theme: 'dark'
      }
    ];

    this.data.trips = [
      {
        _id: '663e30000000000000000001',
        ownerId: demoId,
        name: '5-Day Goa Beach & Heritage Trip',
        startingLocation: 'Mumbai',
        destination: 'Goa, India',
        departureDate: new Date(Date.now() + 86400000 * 5).toISOString(),
        returnDate: new Date(Date.now() + 86400000 * 10).toISOString(),
        durationDays: 5,
        travelersCount: 4,
        totalBudget: 60000,
        budgetPerPerson: 15000,
        currency: 'INR',
        travelStyle: 'Standard',
        interests: ['Beaches', 'Food', 'Culture'],
        status: 'planned',
        overview: 'A scenic 5-day coastal getaway to Goa exploring sandy beaches, Portuguese heritage architecture, and coastal seafood thalis.',
        itinerary: [
          {
            day: 1,
            title: 'Arrival & North Goa Beaches',
            theme: 'Coastal Sunset & Relaxation',
            activities: [
              { time: '11:00 AM', title: 'Check-in to Boutique Resort', description: 'Arrive from Mumbai and settle into accommodation.', location: 'Calangute, North Goa', estimatedCost: 0 },
              { time: '04:30 PM', title: 'Calangute & Baga Beach Stroll', description: 'Watch the sunset and enjoy beachside shacks.', location: 'Baga Beach', estimatedCost: 1000 },
              { time: '08:00 PM', title: 'Goan Seafood Dinner', description: 'Traditional Goan fish curry and local specialties.', location: 'Brittos, Baga', estimatedCost: 2500 }
            ],
            meals: { breakfast: 'In-transit snacks', lunch: 'Beach shack snacks & coconut water', dinner: 'Brittos Seafood Restaurant' },
            stay: 'Standard boutique hotel near Baga Beach'
          },
          {
            day: 2,
            title: 'Heritage Forts & Water Sports',
            theme: 'History & Adventure',
            activities: [
              { time: '09:30 AM', title: 'Explore Fort Aguada & Lighthouse', description: 'Historic 17th-century Portuguese fortress with panoramic sea views.', location: 'Sinquerim', estimatedCost: 400 },
              { time: '02:00 PM', title: 'Water Sports Experience', description: 'Parasailing and jet ski ride with certified instructors.', location: 'Calangute Beach', estimatedCost: 3500 },
              { time: '07:30 PM', title: 'Anjuna Night Market Walk', description: 'Vibrant local crafts, live music, and street food.', location: 'Anjuna', estimatedCost: 1500 }
            ],
            meals: { breakfast: 'Continental buffet at resort', lunch: 'Cafe Chocolatti, Candolim', dinner: 'Curlies Beach Shack, Anjuna' },
            stay: 'Standard boutique hotel near Baga Beach'
          }
        ],
        budgetBreakdown: {
          transportation: 12000,
          accommodation: 24000,
          food: 14000,
          activities: 7000,
          miscellaneous: 3000,
          totalEstimated: 60000,
          budgetPerPerson: 15000,
          isEstimateNotice: 'All figures are reasonable market approximations for planning purposes; real-time booking prices vary.'
        },
        packingChecklist: [
          { category: 'Clothing', item: 'Light cotton shirts and shorts', checked: true },
          { category: 'Essentials', item: 'Valid ID proofs & travel tickets', checked: true },
          { category: 'Health & Toiletries', item: 'Sunscreen (SPF 50) & shades', checked: false },
          { category: 'Electronics', item: 'Power bank & waterproof phone pouch', checked: false }
        ],
        preparationChecklist: [
          { task: 'Confirm flight/train tickets from Mumbai to Goa', checked: true },
          { task: 'Reserve airport transfer / taxi service', checked: false },
          { task: 'Confirm resort check-in timing', checked: false }
        ],
        isAiGenerated: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    this.data.projects = [
      {
        _id: '663e40000000000000000001',
        ownerId: demoId,
        title: 'LifePilot AI Hackathon Portal',
        description: 'Building an all-in-one everyday assistant',
        status: 'Active',
        progress: 65,
        milestones: [
          { title: 'AI Orchestrator', completed: true },
          { title: 'Frontend UI', completed: true },
          { title: 'Local DB & Testing', completed: false }
        ],
        createdAt: new Date().toISOString()
      }
    ];

    this.data.tasks = [
      {
        _id: '663e50000000000000000001',
        ownerId: demoId,
        title: 'Finalize LifePilot Demo Presentation',
        status: 'In Progress',
        priority: 'Urgent',
        dueDate: new Date(Date.now() + 86400000 * 2).toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        _id: '663e50000000000000000002',
        ownerId: demoId,
        title: 'Review Travel Itinerary & Packing Checklist',
        status: 'To Do',
        priority: 'High',
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        _id: '663e50000000000000000003',
        ownerId: demoId,
        title: 'Architecture & Verification Test Suite',
        status: 'Completed',
        priority: 'Medium',
        dueDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ];

    this.data.notifications = [
      {
        _id: '663e60000000000000000001',
        ownerId: demoId,
        recipientId: demoId,
        title: 'Welcome to LifePilot AI',
        message: 'Your workspace is ready. Try planning a trip or organizing a project!',
        type: 'system',
        read: false,
        createdAt: new Date().toISOString()
      }
    ];
  }

  persist() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[LocalStore] Error persisting local_db.json:', err.message);
    }
  }

  getCollection(name) {
    const key = name.toLowerCase();
    if (!this.data[key]) {
      this.data[key] = [];
    }
    return this.data[key];
  }

  saveDoc(collectionName, docData) {
    const list = this.getCollection(collectionName);
    const index = list.findIndex(d => d._id === docData._id);
    if (index >= 0) {
      list[index] = { ...docData };
    } else {
      list.push({ ...docData });
    }
    this.persist();
  }

  collection(name) {
    const self = this;
    const colName = name.toLowerCase();

    return {
      find(query = {}) {
        return new LocalQuery(async () => {
          const list = self.getCollection(colName);
          const filterFn = sift(normalizeQuery(query));
          const matches = list.filter(filterFn);
          return matches.map(d => new LocalDoc(d, colName, self));
        });
      },

      findOne(query = {}) {
        return new LocalQuery(async () => {
          const list = self.getCollection(colName);
          const filterFn = sift(normalizeQuery(query));
          const match = list.find(filterFn);
          return match ? new LocalDoc(match, colName, self) : null;
        });
      },

      findById(id) {
        return this.findOne({ _id: id ? id.toString() : null });
      },

      async create(docData) {
        if (Array.isArray(docData)) {
          const created = [];
          for (const item of docData) {
            created.push(await this.create(item));
          }
          return created;
        }

        const data = { ...docData };
        if (!data._id) {
          data._id = new ObjectId().toString();
        } else {
          data._id = data._id.toString();
        }

        if (colName === 'users' && data.password && !data.password.startsWith('$2')) {
          const salt = bcrypt.genSaltSync(10);
          data.password = bcrypt.hashSync(data.password, salt);
        }

        data.createdAt = data.createdAt || new Date().toISOString();
        data.updatedAt = new Date().toISOString();

        self.getCollection(colName).push(data);
        self.persist();

        return new LocalDoc(data, colName, self);
      },

      async findOneAndUpdate(query, update, options = {}) {
        const doc = await this.findOne(query);
        if (!doc) return null;

        const updateData = update.$set ? { ...update.$set } : { ...update };
        delete updateData._id;

        for (const [key, val] of Object.entries(updateData)) {
          doc[key] = val;
          doc._data[key] = val;
        }

        doc._data.updatedAt = new Date().toISOString();
        self.saveDoc(colName, doc._data);

        return options.new !== false ? doc : doc;
      },

      async findByIdAndUpdate(id, update, options = {}) {
        return this.findOneAndUpdate({ _id: id ? id.toString() : null }, update, options);
      },

      async findOneAndDelete(query) {
        const list = self.getCollection(colName);
        const filterFn = sift(normalizeQuery(query));
        const index = list.findIndex(filterFn);
        if (index === -1) return null;
        const [removed] = list.splice(index, 1);
        self.persist();
        return new LocalDoc(removed, colName, self);
      },

      async deleteOne(query) {
        const doc = await this.findOneAndDelete(query);
        return { deletedCount: doc ? 1 : 0, acknowledged: true };
      },

      async findByIdAndDelete(id) {
        return this.findOneAndDelete({ _id: id ? id.toString() : null });
      },

      async countDocuments(query = {}) {
        const list = self.getCollection(colName);
        const filterFn = sift(normalizeQuery(query));
        return list.filter(filterFn).length;
      },

      async updateMany(query, update) {
        const list = self.getCollection(colName);
        const filterFn = sift(normalizeQuery(query));
        let modifiedCount = 0;
        const updateData = update.$set ? { ...update.$set } : { ...update };

        list.forEach(d => {
          if (filterFn(d)) {
            Object.assign(d, updateData);
            d.updatedAt = new Date().toISOString();
            modifiedCount++;
          }
        });

        if (modifiedCount > 0) self.persist();
        return { modifiedCount, acknowledged: true };
      },

      async deleteMany(query = {}) {
        const list = self.getCollection(colName);
        const filterFn = sift(normalizeQuery(query));
        const initialLen = list.length;
        const remaining = list.filter(d => !filterFn(d));
        self.data[colName] = remaining;
        const deletedCount = initialLen - remaining.length;
        if (deletedCount > 0) self.persist();
        return { deletedCount, acknowledged: true };
      }
    };
  }
}

const localStore = new LocalStore();

function wrapModel(mongooseModel, collectionName) {
  const localCol = localStore.collection(collectionName);

  const handler = {
    get(target, prop, receiver) {
      const isMongooseConnected = mongoose.connection.readyState === 1;

      // When MongoDB is connected, use real Mongoose
      if (isMongooseConnected) {
        return Reflect.get(target, prop, receiver);
      }

      // When MongoDB is disconnected, use localStore
      if (typeof localCol[prop] === 'function') {
        return (...args) => localCol[prop](...args);
      }

      return Reflect.get(target, prop, receiver);
    }
  };

  return new Proxy(mongooseModel, handler);
}

module.exports = { localStore, wrapModel };

