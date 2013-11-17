Pages = Meteor.Paginate("messages", {
    perPage: 25,
    sort: {date: 1},
//    infinite: true,
    router: "iron-router"
});