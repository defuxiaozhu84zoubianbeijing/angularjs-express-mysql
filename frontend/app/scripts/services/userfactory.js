'use strict';
/*
 * $resource: The default set contains these actions:

  { 'get':    {method:'GET'},
    'save':   {method:'POST'},
    'query':  {method:'GET', isArray:true},
    'remove': {method:'DELETE'},
    'delete': {method:'DELETE'} 
    };
 */
var services = angular.module('frontendApp');
services.factory('UserFactory', ['$resource',
    function($resource) {
        return $resource('/users/:id', {id:"@id"}, {
            list: {//query
                method: 'GET',
                isArray: true
            },
            show: {//get
                method: 'GET'
            },
            //get: { method: 'GET', params: {id: '@id'} },
            update: {
                method: 'PUT'
            }
        });
    }
]);
