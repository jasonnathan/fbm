
_.extend(Template['_pagesPage'], {
    ready: function() {
        return this.sess("ready");
    },
    items: function() {
        var i, k, p, _i, _len;
        this.sess("redraw");
        p = this.getPage(this.sess((this.sess("ready") ? "currentPage" : "oldPage")));
        if (p == null) {
            return;
        }
        for (k = _i = 0, _len = p.length; _i < _len; k = ++_i) {
            i = p[k];
            p[k]['_t'] = this.itemTemplate;
        }
        return p;
    },
    item: function() {
        return Template[this._t](this);
    }
});

_.extend(Template['_pagesNav'], {
    show: function() {
        return !this.infinite && 1 < this.sess("totalPages");
    },
    link: function() {
        var p, self, total;
        self = this._p;
        if (self.router) {
            p = this.n;
            if (p < 1) {
                p = 1;
            }
            total = self.sess("totalPages");
            if (p > total) {
                p = total;
            }
            return self.route + p;
        }
        return "#";
    },
    paginationNeighbors: function() {
        this.sess("currentPage");
        return this.paginationNeighbors();
    },
    events: {
        "click a": function(e) {
            var n, self;
            n = e.target.parentNode.parentNode.parentNode.getAttribute('data-pages');
            self = __Pages.prototype.paginations[n];
            return (_.throttle(function(e, self, n) {
                if (!self.router) {
                    e.preventDefault();
                    return self.onNavClick.call(self, n);
                }
            }, self.rateLimit * 1000))(e, self, this.n);
        }
    }
});

_.extend(Template['_pagesItemDefault'], {
    properties: function() {
        var A, k, v;
        A = [];
        for (k in this) {
            v = this[k];
            if (k !== "_id" && k !== "_t") {
                A.push({
                    name: k,
                    value: v
                });
            }
        }
        return A;
    }
});


Template.box.isJason = function() {
    return this.user !== 'Elizabeth Danielle';
};

Template.box.formattedDate = function(){
    return moment(this.date).format("ddd, Do MMM YY [at] HH:mm");
}


//m = new Meteor.Collection("messages");

//Meteor.startup(function() {
//    Session.set('isLoading', true);
//
//    Meteor.call("getMessages", function(e, r) {
//        Session.set('isLoading', false);
//        if (e)
//            console.log(e);
//
//        return Session.set('messagesArray', r);
//    });
//})

//if (Meteor.isClient) {
//    Template.box.messages = function() {
//        return Session.get('messagesArray');
//    };
//    Template.box.isLoading = function() {
//        return Session.get('isLoading');
//    }
//    Template.box.isJason = function() {
//        return this.user !== 'Elizabeth Danielle';
//    };
//}


function insertMessage(message) {
    return setTimeout(function() {
        //return messages.insert(message);
    }, 100);
}

function parseMessage() {
    var m = $('.message');
    // window.messages = messages;
    m.each(function() {
        var e = $(this), p = e.next("p").text().trim(),
                user = e.find(".user").text().trim(),
                d = e.find(".meta").text().trim(),
                comma = d.indexOf(",") + 2,
                strip = comma + 16,
                r = d.substr(comma, d.length - strip),
                insert = {
                    user: user,
                    date: Date.parse(r.trim() + " " + d.substr(-12, 5).trim()),
                    message: p
                }
        return setTimeout(function() {
            //return console.log(insert);
            return insertMessage(insert);
        }, 0);
    });
}