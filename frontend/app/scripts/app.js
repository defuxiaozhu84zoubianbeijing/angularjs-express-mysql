'use strict';

angular.module('frontendApp',
	['LocalStorageModule','ngCookies', 'ngResource', 'ngSanitize', 'ui.router', 'ui.bootstrap','ui.select2','ui.sortable','ui.tree', 'pascalprecht.translate', 'tmh.dynamicLocale',
     'frontendApp.router', 'ngFileUpload', 'ngClipboard','markdown','angularTreeview','ngIdle','relativeDate'])
    .config(['$stateProvider', '$urlRouterProvider', '$locationProvider', '$httpProvider', '$logProvider','ngClipProvider','$translateProvider', 'tmhDynamicLocaleProvider',
        function($stateProvider, $urlRouterProvider, $locationProvider, $httpProvider, $logProvider, ngClipProvider, $translateProvider, tmhDynamicLocaleProvider) {
            $logProvider.debugEnabled = true;
            ngClipProvider.setPath("bower_components/zeroclipboard/dist/ZeroClipboard.swf");
          //>>> IE browser cache problem >>>
          $httpProvider.defaults.cache = false;
          if (!$httpProvider.defaults.headers.get) {
            $httpProvider.defaults.headers.get = {};
          }
          // disable IE ajax request caching
          $httpProvider.defaults.headers.get['If-Modified-Since'] = '0';
          //<<<
            // For Access-Control-Allow-Origin and Set-Cookie header
            // $httpProvider.defaults.useXDomain = true;
            // $httpProvider.defaults.withCredentials = true;

            // FIX for trailing slashes. Gracefully "borrowed" from https://github.com/angular-ui/ui-router/issues/50
            $urlRouterProvider.rule(function($injector, $location) {
                if($location.protocol() === 'file')
                    return;

                var path = $location.path()
                // Note: misnomer. This returns a query object, not a search string
                    , search = $location.search()
                    , params
                    ;

                // check to see if the path already ends in '/'
                if (path[path.length - 1] === '/') {
                    return;
                }

                // If there was no search string / query params, return with a `/`
                if (Object.keys(search).length === 0) {
                    return path + '/';
                }
                //console.log('>>search:'+ JSON.stringify(search));
                // Otherwise build the search string and return a `/?` prefix
                params = [];
                angular.forEach(search, function(v, k){
                    params.push(k + '=' + v);
                });
                return path + '/?' + params.join('&');
            });

            // gets rid of the # in urls
            //$locationProvider.html5Mode(false); //.hashPrefix('!');
            /*
             * Set up an interceptor to watch for 401 errors. The
             * server, rather than redirect to a login page (or
             * whatever), just returns a 401 error if it receives a
             * request that should have a user session going. Angular
             * catches the error below and says what happens - in this
             * case, we just redirect to a login page. You can get a
             * little more complex with this strategy, such as queueing
             * up failed requests and re-trying them once the user logs
             * in. Read all about it here:
             * http://www.espeo.pl/2012/02/26/authentication-in-angularjs-application
             */
            var interceptor = ['$q', '$location', '$rootScope', 'redirects',function ($q, $location, $rootScope, redirects) {
                function success(response) {
                    return response;
                }
                function error(response) {
                    var status = response.status;
                    if (status === 401 || status === 403) {
                        //console.log('>>location url: '+ $location.url());
                        $rootScope.redirect = $location.url(); // save the current url so we can redirect the user back
                        if($location.path() != '/login/') redirects.setRedirectURL($location.url());
                        $rootScope.currentUser = null;
                        $location.path('/login');

                    }
                    return $q.reject(response);
                }
                return function (promise) {
                    return promise.then(success, error);
                }
            }];

            $httpProvider.interceptors.push(interceptor);
            // Initialize angular-translate
            $translateProvider.useLoader('$translatePartialLoader', {
              urlTemplate: 'i18n/{lang}/{part}.json'
            });

            $translateProvider.preferredLanguage('en');
            //$translateProvider.useCookieStorage();
            $translateProvider.useLocalStorage();
            // two options are available: null (nothing) and 'escaped' (for HTML).
            $translateProvider.useSanitizeValueStrategy(null);

            tmhDynamicLocaleProvider.localeLocationPattern('bower_components/angular-i18n/angular-locale_{{locale}}.js');
            tmhDynamicLocaleProvider.useCookieStorage('NG_TRANSLATE_LANG_KEY');

        }
    ])
    .run(['$rootScope', '$state','$stateParams', 'AuthFactory', '$http','$cookies', '$location', 'redirects','$translate','languages',
        function ($rootScope, $state, $stateParams, AuthFactory, $http, $cookies, $location, redirects, $translate, languages) {
        // It's very handy to add references to $state and $stateParams to the $rootScope
        // so that you can access them from any scope within your applications.For example,
        // <li ng-class="{ active: $state.includes('contacts.list') }"> will set the <li>
        // to active whenever 'contacts.list' or one of its decendents is active.
        $rootScope.$state = $state;
        $rootScope.$stateParams = $stateParams;
        $rootScope.Auth = AuthFactory;
        //$http.defaults.headers.post['x-csrf-token'] = $cookies._csrf;
        //$http.defaults.headers.post['X-XSRF-TOKEN'] = $cookies['XSRF-TOKEN'];
        //$http.defaults.headers.post['_csrf'] = $cookies._csrf;

        //gettextCatalog.currentLanguage = settings.gettext.language;
        //gettextCatalog.debug = settings.gettext.debug;

        $rootScope.$on('$stateChangeError',
          function (event, toState, toParams, fromState, fromParams, error) {
            console.log('$stateChangeError', event, toState, toParams, fromState, fromParams, error);
          });
        $rootScope.$on("$stateChangeStart", function (event, toState, toParams, fromState, fromParams) {
            // Update the language
            languages.getCurrent().then(function (language) {
              //console.log(language);
              $translate.use(language);
            });

            //console.log('>>location: '+ $location.path());
            if($location.path().indexOf('/login') === -1) redirects.setRedirectURL($location.path());
            if (!AuthFactory.authorize(toState.data.access)) {
                $rootScope.error = "You tried accessing a route you don't have access to...";
                event.preventDefault();
                //console.log('>>fromState.url: %s', fromState.url);
                if(fromState.url === '^') {
                    if(AuthFactory.isLoggedIn()) {
                        $state.go('user.home');
                    } else {
                        $rootScope.error = null;
                        $state.go('anon.login');
                    }
                }
            } else {
              $rootScope.error = null;
            }
        });

    }]);
