const { DataStore } = require('notarealdb');

const store = new DataStore('./data');

module.exports = {
   students:store.collection('students'),
   colleges:store.collection('colleges'),
   jobs:store.collection('jobs'),
   skills:store.collection('skills'),
   hits:store.collection('hits'),
   users:store.collection('users')
};