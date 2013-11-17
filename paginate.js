var Pages,
        __indexOf = [].indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
        if (i in this && this[i] === item)
            return i;
    }
    return -1;
};

this.__Pages = Pages = (function() {

    function Pages(collection, settings) {
        var key, self, value;
        settings = settings || {};
        this.setCollection(collection);
        this.setId(this.Collection._name);
        this.requested = [];
        this.received = [];
        this.queue = [];
        this.cache = {};
        this.timeouts = {};
        this.subscriptions = [];
        Pages.prototype.paginations[this.name] = this;
        for (key in settings) {
            value = settings[key];
            this.set(key, value, false, true);
        }
        this.setRouter();
        if (Meteor.isServer) {
            this.setMethods();
            self = this;
            //console.log("Publishing to: " + this.name)
            Meteor.publish(this.name, function(page) {
                return self.publish.call(self, page, this);
            });
        } else {
            this.setTemplates();
            this.countPages();
            console.log(this.infinite);
            if (this.infinite) {
                this.setInfiniteTrigger();
            }
            if (Pages.prototype._instances === 0) {
                this.watch();
            }
            this.syncSettings((function(err, ch) {
                if (ch > 0) {
                    return this.reload();
                }
            }).bind(this));
            Pages.prototype._instances += 1;
        }
        return this;
    }

    Pages.prototype.dataMargin = 3;

    Pages.prototype.filters = {};

    Pages.prototype.infinite = false;

    Pages.prototype.infiniteTrigger = 600;

    Pages.prototype.itemTemplate = "_pagesItemDefault";

    Pages.prototype.navShowFirst = false;

    Pages.prototype.navShowLast = false;

    Pages.prototype.onReloadPage1 = false;

    Pages.prototype.pageSizeLimit = 60;

    Pages.prototype.paginationMargin = 3;

    Pages.prototype.perPage = 10;

    Pages.prototype.rateLimit = 1;

    Pages.prototype.requestTimeout = 2;

    Pages.prototype.homeRoute = "/";

    Pages.prototype.route = "/page/";

    Pages.prototype.router = false;

    Pages.prototype.routerTemplate = "pages";

    Pages.prototype.sort = {};

    Pages.prototype.templateName = false;

    Pages.prototype.availableSettings = {
        dataMargin: Number,
        filters: Object,
        itemTemplate: String,
        navShowFirst: Boolean,
        navShowLast: Boolean,
        onReloadPage1: Boolean,
        paginationMargin: Number,
        perPage: Number,
        requestTimeout: Number,
        route: String,
        router: true,
        routerTemplate: String,
        sort: Object
    };

    Pages.prototype._instances = 0;

    Pages.prototype._ready = true;

    Pages.prototype._bgready = true;

    Pages.prototype._currentPage = 1;

    Pages.prototype.collections = {};

    Pages.prototype.paginations = {};

    Pages.prototype.currentSubscription = null;

    Pages.prototype.methods = {
        "CountPages": function() {
            return Math.ceil(this.Collection.find(this.filters, {
                sort: this.sort
            }).count() / this.perPage);
        },
        "Set": function(k, v) {
            var ch, _k, _v;
            v = v || void 0;
            if (v != null) {
                ch = this.set(k, v, false, true);
            } else {
                ch = 0;
                for (_k in k) {
                    _v = k[_k];
                    ch += this.set(_k, _v, false, true);
                }
            }
            return ch;
        },
        "Unsubscribe": function() {
            var i, j, s, _results;
            _results = [];
            while (this.subscriptions.length) {
                i = this.subscriptions.shift();
                s = i[0];
                _results.push((function() {
                    var _i, _len, _ref, _results1;
                    _ref = i[1];
                    _results1 = [];
                    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                        j = _ref[_i];
                        try {
                            _results1.push(s.removed(this.Collection._name, j));
                        } catch (e) {
                            _results1.push(this.log(e));
                        }
                    }
                    return _results1;
                }).call(this));
            }
            return _results;
        }
    };

    Pages.prototype.log = function(msg) {
        return console.log("" + this.name + " " + msg);
    };

    Pages.prototype.syncSettings = function(cb) {
        var S, k;
        S = {};
        for (k in this.availableSettings) {
            S[k] = this[k];
        }
        return this.set(S, void 0, true, cb.bind(this));
    };

    Pages.prototype.setId = function(name) {
        var n;
        if (this.templateName) {
            name = this.templateName;
        }
        if (name in Pages.prototype.paginations) {
            n = name.match(/[0-9]+$/);
            if (n != null) {
                name = name.slice(0, +n[0].length + 1 || 9e9) + (parseInt(n) + 1);
            } else {
                name = name + "2";
            }
        }
        this.id = "pages." + name;
        return this.name = name;
    };

    Pages.prototype.setCollection = function(collection) {
        if (typeof collection === 'object') {
            Pages.prototype.collections[collection._name] = collection;
            return this.Collection = collection;
        } else {
            try {
                this.Collection = new Meteor.Collection(collection);
                return Pages.prototype.collections[this.name] = this.Collection;
            } catch (e) {
                return this.Collection = Pages.prototype.collections[this.name];
            }
        }
    };

    Pages.prototype.setMethods = function() {
        var f, n, nm, _ref;
        nm = {};
        _ref = this.methods;
        for (n in _ref) {
            f = _ref[n];
            nm[this.id + n] = f.bind(this);
        }
        this.methods = nm;
        return Meteor.methods(this.methods);
    };

    Pages.prototype.setRouter = function() {
        var pr, self, t;
        if (this.router === "iron-router") {
            pr = "" + this.route + ":n";
            t = this.routerTemplate;
            self = this;
            return Router.map(function() {
                if (self.homeRoute) {
                    this.route("home", {
                        path: self.homeRoute,
                        template: t,
                        before: function() {
                            return self.sess("currentPage", 1);
                        }
                    });
                }
                if (!self.infinite) {
                    return this.route("page", {
                        path: pr,
                        template: t,
                        before: function() {
                            return self.onNavClick(parseInt(this.params.n));
                        }
                    });
                }
            });
        }
    };

    Pages.prototype.setTemplates = function() {
        var name;
        name = this.templateName ? this.templateName : this.name;
        Template[name].pagesNav = (function() {
            return Template['_pagesNav'](this);
        }).bind(this);
        return Template[name].pages = (function() {
            return Template['_pagesPage'](this);
        }).bind(this);
    };

    Pages.prototype.defaults = function(k, v) {
        return v ? (Pages.prototype[k] = v) : Pages.prototype[k];
    };

    Pages.prototype.countPages = function() {
        return Meteor.call("" + this.id + "CountPages", (function(e, r) {
            return this.sess("totalPages", r);
        }).bind(this));
    };

    Pages.prototype.currentPage = function() {
        if (Meteor.isClient && (this.sess("currentPage") != null)) {
            return this.sess("currentPage");
        } else {
            return this._currentPage;
        }
    };

    Pages.prototype.isReady = function() {
        return this.sess("ready");
    };

    Pages.prototype.ready = function(p) {
        this._ready = true;
        if (p === true || p === this.currentPage() && (typeof Session !== "undefined" && Session !== null)) {
            return this.sess("ready", true);
        }
    };

    Pages.prototype.unsubscribe = function(cb) {
        return this.call("Unsubscribe", (function() {
            return setTimeout((function() {
                if (cb != null) {
                    return cb();
                }
            }).bind(this), 500);
        }).bind(this));
    };

    Pages.prototype.loading = function(p) {
        this._bgready = false;
        this._ready = false;
        if (p === this.currentPage() && (typeof Session !== "undefined" && Session !== null)) {
            return this.sess("ready", false);
        }
    };

    Pages.prototype.logRequest = function(p) {
        this.timeLastRequest = this.now();
        this.loading(p);
        if (__indexOf.call(this.requested, p) < 0) {
            return this.requested.push(p);
        }
    };

    Pages.prototype.logResponse = function(p) {
        if (__indexOf.call(this.received, p) < 0) {
            return this.received.push(p);
        }
    };

    Pages.prototype.clearQueue = function() {
        return this.queue = [];
    };

    Pages.prototype.sess = function(k, v) {
        k = "" + this.id + "." + k;
        if (v != null) {
            return Session.set(k, v);
        } else {
            return Session.get(k);
        }
    };

    Pages.prototype.set = function(k, v, server, init, cb) {
        var ch, _k, _v;
        v = v || void 0;
        server = server || true;
        init = init || false;
        cb = cb || this.reload;

        if (cb) {
            cb = cb.bind(this);
        }
        if (Meteor.isClient && server) {
            Meteor.call("" + this.id + "Set", k, v, cb ? cb : void 0);
        }
        if (v != null) {
            ch = this._set(k, v, init);
        } else {
            ch = 0;
            for (_k in k) {
                _v = k[_k];
                ch += this._set(_k, _v, init);
            }
        }
        return ch;
    };

    Pages.prototype._set = function(k, v, init) {
        var ch;
        if (init == null) {
            init = false;
        }
        ch = 0;
        if (init || k in this.availableSettings) {
            if ((this.availableSettings[k] != null) && this.availableSettings[k] !== true) {
                check(v, this.availableSettings[k]);
            }
            if (JSON.stringify(this[k]) !== JSON.stringify(v)) {
                ch = 1;
            }
            this[k] = v;
        } else {
            new Meteor.Error(400, "Setting not available.");
        }
        return ch;
    };

    Pages.prototype.now = function() {
        return (new Date()).getTime();
    };

    Pages.prototype.call = function(method, cb) {
        return Meteor.call(this.id + method, cb.bind(this));
    };

    Pages.prototype.reload = function() {
        this.clearCache();
        return this.unsubscribe((function() {
            return this.call("CountPages", (function(e, total) {
                var p;
                this.sess("totalPages", total);
                p = this.currentPage();
                if ((!(p != null)) || this.onReloadPage1 || p > total) {
                    p = 1;
                }
                this.sess("currentPage", false);
                return this.sess("currentPage", p);
            }).bind(this));
        }).bind(this));
    };

    Pages.prototype.clearCache = function() {
        this.cache = {};
        this.requested = [];
        return this.received = [];
    };

    Pages.prototype.redraw = function() {
        var r;
        r = this.sess("redraw");
        return this.sess("redraw", r != null ? r + 1 : 1);
    };

    Pages.prototype.onData = function(page) {
        this.currentSubscription = page;
        this.logResponse(page);
        this.ready(page);
        if (this.infinite) {
            if (page === 1) {
                return this.cache[1] = this._getPage(1).fetch();
            } else {
                return this.cache[1] = this.cache[1].concat(this._getPage(1).fetch());
            }
        } else {
            this.cache[page] = this._getPage(1).fetch();
            return this.unsubscribe((function() {
                this._bgready = true;
                return this.checkQueue();
            }).bind(this));
        }
    };

    Pages.prototype.checkQueue = function() {
        var i;
        if (this.queue.length) {
            while (!(__indexOf.call(this.neighbors(this.currentPage()), i) >= 0 || !this.queue.length)) {
                i = this.queue.shift();
            }
            if (__indexOf.call(this.neighbors(this.currentPage()), i) >= 0) {
                return this.recvPage(i);
            }
        }
    };

    Pages.prototype.setPerPage = function() {
        return this.perPage = this.pageSizeLimit < this.perPage ? this.pageSizeLimit : this.perPage;
    };

    Pages.prototype.publish = function(page, sub) {
        var c, ids, skip;
        this.setPerPage();
        skip = (page - 1) * this.perPage;
        if (skip < 0) {
            skip = 0;
        }
        c = this.Collection.find(this.filters, {
            sort: this.sort,
            skip: skip,
            limit: this.perPage
        });
        ids = _.pluck(c.fetch(), "_id");
        this.subscriptions.push([sub, ids]);
        return c;
    };

    Pages.prototype._getPage = function(page) {
        this.setPerPage();
        return this.Collection.find({}, {
            skip: this.Collection.find().count() - this.perPage,
            limit: this.perPage
        });
    };

    Pages.prototype.getPage = function(page) {
        if (page == null) {
            page = this.currentPage();
        }
        page = parseInt(page);
        if (page === NaN) {
            return;
        }
        if (Meteor.isClient) {
            if (page < this.sess("totalPages")) {
                this.recvPages(page);
            }
            if (this.infinite) {
                if (this.cache[1] == null) {
                    return;
                }
                return this.cache[1].slice(0, page * this.perPage);
            } else if (this.cache[page] != null) {
                return this.cache[page];
            }
        }
    };

    Pages.prototype.recvPage = function(page) {
        if (page in this.cache || __indexOf.call(this.requested, page) >= 0) {
            return;
        }
        if (page === this.currentPage()) {
            this.clearQueue();
        }
        if (this.queue.length) {
            return this.queue.push(page);
        } else {
            return this._recvPage(page);
        }
    };

    Pages.prototype._recvPage = function(page) {
        this.logRequest(page);
        "Run again if something goes wrong and the page is still needed";

        this.timeouts[page] = setTimeout((function(page) {
            if ((__indexOf.call(this.received, page) < 0 || __indexOf.call(this.requested, page) < 0) && __indexOf.call(this.neighbors(this.currentPage()), page) >= 0) {
                return this.recvPage(page);
            }
        }).bind(this, page), this.requestTimeout * 1000);
        "Subscription may block unless deferred.";

        return Meteor.defer((function(page) {
            //console.log("Subscribing to: " + this.name);
            return this.subscriptions[page] = Meteor.subscribe(this.name, page, {
                onReady: (function(page) {
                    return this.onData(page);
                }).bind(this, page),
                onError: function(e) {
                    return console.log('Error', e);
                }
            });
        }).bind(this, page));
    };

    Pages.prototype.recvPages = function(page) {
        var p, _i, _len, _ref, _results;
        _ref = this.neighbors(page);
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            p = _ref[_i];
            if (!(__indexOf.call(this.received, p) >= 0 || p in this.cache)) {
                _results.push(this.recvPage(p));
            } else {
                _results.push(void 0);
            }
        }
        return _results;
    };

    Pages.prototype.forceClearCollection = function() {
        var count, i, _i, _len, _ref, _results;
        count = this.Collection.find().count();
        if (count > 0) {
            _ref = this.Collection.find().fetch();
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                i = _ref[_i];
                try {
                    _results.push(this.Collection._collection.remove({
                        _id: i._id
                    }));
                } catch (e) {

                }
            }
            return _results;
        }
    };

    Pages.prototype.watch = function() {
        return setInterval(function() {
            var i, k, p, v, _i, _len, _ref, _ref1;
            _ref = Pages.prototype.paginations;
            for (k in _ref) {
                v = _ref[k];
                p = v.currentPage();
                if (v.isReady()) {
                    _ref1 = document.querySelectorAll('.pagination-items');
                    for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                        i = _ref1[_i];
                        if (i.children.length === 0) {
                            v.sess("ready", false);
                        }
                    }
                } else {
                    if (__indexOf.call(v.received, p) >= 0) {
                        v.ready(p);
                    } else if (__indexOf.call(v.requested, p) < 0) {
                        v.recvPages(p);
                    }
                }
                if ((v.cache[p] != null) && v.cache[p].length === 0) {
                    return v.reload();
                }
                v.checkQueue(v.currentPage());
            }
        }, 1000);
    };

    Pages.prototype.neighbors = function(page) {
        var d, np, pp, _i, _ref;
        this.n = [page];
        if (this.dataMargin === 0) {
            return this.n;
        }
        for (d = _i = 1, _ref = this.dataMargin; 1 <= _ref ? _i <= _ref : _i >= _ref; d = 1 <= _ref ? ++_i : --_i) {
            np = page + d;
            if (np <= this.sess("totalPages")) {
                this.n.push(np);
            }
            pp = page - d;
            if (pp > 0) {
                this.n.push(pp);
            }
        }
        return this.n;
    };

    Pages.prototype.paginationNeighbors = function() {
        var from, i, k, margin, n, p, page, to, total, _i, _j, _len;
        page = this.currentPage();
        total = this.sess("totalPages");
        margin = this.paginationMargin;
        from = page - margin;
        to = page + margin;
        if (from < 1) {
            to += 1 - from;
            from = 1;
        }
        if (to > total) {
            from -= to - total;
            to = total;
        }
        if (from < 1) {
            from = 1;
        }
        if (to > total) {
            to = total;
        }
        n = [];
        if (this.navShowFirst) {
            n.push({
                p: "«",
                n: 1,
                active: "",
                disabled: page === 1 ? "disabled" : ""
            });
        }
        n.push({
            p: "<",
            n: page - 1,
            active: "",
            disabled: page === 1 ? "disabled" : ""
        });
        for (p = _i = from; from <= to ? _i <= to : _i >= to; p = from <= to ? ++_i : --_i) {
            n.push({
                p: p,
                n: p,
                active: p === page ? "current" : "",
                disabled: page > total ? "disabled" : ""
            });
        }
        n.push({
            p: ">",
            n: page + 1,
            active: "",
            disabled: page >= total ? "disabled" : ""
        });
        if (this.navShowLast) {
            n.push({
                p: "»",
                n: total,
                active: "",
                disabled: page >= total ? "disabled" : ""
            });
        }
        for (k = _j = 0, _len = n.length; _j < _len; k = ++_j) {
            i = n[k];
            n[k]['_p'] = this;
        }
        return n;
    };

    Pages.prototype.onNavClick = function(n) {
        var total;
        total = this.sess("totalPages");
        $("html, body").animate({ scrollTop: 0 }, "fast");
        if (n <= total && n > 0) {
            Deps.nonreactive((function() {
                return this.sess("oldPage", this.sess("currentPage"));
            }).bind(this));
            return this.sess("currentPage", n);
        }
    };

    Pages.prototype.setInfiniteTrigger = function() {
        return window.onscroll = (_.throttle(function() {
            var l, oh, t;
            t = this.infiniteTrigger;
            oh = document.body.offsetHeight;
            if (t > 1) {
                l = oh - t;
            } else if (t > 0) {
                l = oh * t;
            } else {
                return;
            }
            if ((window.innerHeight + window.scrollY) >= l) {
                return this.sess("currentPage", this.sess("currentPage") + 1);
            }
        }, this.rateLimit * 1000)).bind(this);
    };

    return Pages;

})();

Meteor.Paginate = function(collection, settings) {
    return new Pages(collection, settings);
};
