// /client/code/app/routes

/* AngularJS client-side routes */

module.exports = function (ngModule) {

	'use strict';

	ngModule.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {

		// setup routing
		$routeProvider
			.when('/', { action: 'introduction.view' })
			.when('/options', { action: 'options.view' })
			.when('/im', { action: 'im.view' })   
			.when('/edp', { action: 'edp.view' })
			.when('/structure', { action: 'structure.view' })
			.when('/collapse', { action: 'collapse.view' })
			.when('/ff', { action: 'ff.view' })
			.when('/results', { action: 'results.view' })
			.when('/foo', { action: 'foo.view' })
			.when('/bar', { action: 'bar.view' })
			.when('/tests', { action: 'tests.view' })
			.otherwise({ redirectTo: '/'});

		// use html5 push state
		$locationProvider.html5Mode(true);

	}]);
};
