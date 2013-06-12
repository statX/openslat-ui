/*global angular */
// /client/code/app/services.js
/* AngularJS services */

angular.module('app.services', []).
	factory('inputService', ['$rootScope', '$http', '$timeout', 'jsonConverter',
													 function($rootScope, $http, $timeout, jsonConverter) {
		console.log('inputService service created'); 
		var inputJson = {
			"im":{
				"name":"Peak Ground Acceleration (m/s^2)",
				"relationships":[
					{
						"name":"relationship-1",
						"epistemicWeight":0.5,
						"model":{
							"type":"HyperbolicModel",
							"parameters":[
								1221,
								27,
								65
							]
						}
					},
					{
						"name":"relationship-2",
						"epistemicWeight":0.5,
						"model":{
							"type":"HyperbolicModel",
							"parameters":[
								1221,
								29,
								68
							]
						}
					}
				],
				"minIMValue":0,
				"maxIMValue":2.5
			},
			"edps":[
				{
					"identifier":1,
					"name":"2nd storey drift (cm)",
					"distributionFunction":{
						"type":"LogNormalModel",
						"meanModel":{
							"type":"PowerModel",
							"parameters":[
								0.1,
								1.5							]
						},
						"stddModel":{
							"type":"PowerModel",
							"parameters":[
								0.5,
								0
							]
						}
					},
					"minEDPValue":0,
					"maxEDPValue":0.15
				}
			],
			"structure":{
				"performanceGroups":[
					{
						"name": "Columns on the ground floor",
						"quantity": 16,
						"ff": 4,
						"edp": 1
					}
				]
			},
			"demoCollapse": {
				"demoRelationships": [
					{
						"name":"Mean: 1, Log-normal SD: 0.4",
						"epistemicWeight":1,
						"model":{
							"type":"LogNormalModel",
							"mean":1,
							"sd":0.4
						}
					}
				],
				"collapseRelationships": [
					{
						"name":"Mean: 2, Log-normal SD: 0.4",
						"epistemicWeight":1,
						"model":{
							"type":"LogNormalModel",
							"mean":2,
							"sd":0.4
						}
					}
				],
				"demoLoss": {
					"type":"Automatic",
					"extra":1000000
				},
				"collapseLoss": {
					"type":"Manual",
					"mean":1500000000,
					"sd":10000000,
					"epistemicUncertainty":200000
				}
			},
			"calculationOptions": {
				"considerCollapse":true,
				"componentBasedCollapseCost":false,
				"considerDemolition":false,
				"componentBasedDemolitionCost":false,
				"considerDownTime":false,
				"imCalcSteps": 50,
				"edpCalcSteps": 50,
				"demolitionRateCalc": true,
				"collapseRateCalc": true,
				"edpRateCalc": true
			},
			"customffs": [
				{
					"identifier":-1,
					"name":"My Custom Component Type",
					"material":null,
					"damageStates":[
						{
							"meanEDPOnset":-1.0,
							"epistemicStdDev_Mean_LNedp":-1.0,
							"sigmaEDPOnset":-1.0,
							"epistemicStdDev_Var_LNedp":-1.0,
							"upperLimitMeanLoss":-1.0,
							"lowerLimitMeanLoss":-1.0,
							"numberComponentsUpperLimitLoss":-1,
							"numberComponentsLowerLimitLoss":-1,
							"epistemicStdDev_Mean_LNloss":-1.0,
							"sigmaLoss":-1.0,
							"epistemicStdDev_Var_LNloss":-1.0,
							"upperLimitMeanTime":-1.0,
							"lowerLimitMeanTime":-1.0,
							"numberComponentsUpperLimitTime":-1,
							"numberComponentsLowerLimitTime":-1,
							"epistemicStdDev_Mean_LNtime":-1.0,
							"sigmaTime":-1.0,
							"epistemicStdDev_Var_LNtime":-1.0
						}
					]
				}
			]
		};

		return {
			getIm: function(){ return inputJson.im; },
			getEdps: function(){ return inputJson.edps; },
			getEdp: function(id){
				if (inputJson.edps) {
					for (var i = 0; i < inputJson.edps.length; ++i) {
						if (inputJson.edps[i].identifier == id) {
							return inputJson.edps[i];
						}
					}
				}
				return null;
			},
			addEdp: function(edp) {
				var edps = inputJson.edps;
				if (!edp.identifier) {
					// Get the maximum EDP identifier and add one.
					var id = 1;
					for (var i = 0; i < edps.length; ++i) {
						id = Math.max(id, edps[i].identifier);
					}
					edp.identifier = id + 1;
				}
				edps.push(edp);
			},
			deleteEdp: function(edp){
				var edps = inputJson.edps;
				for (var i = 0; i < edps.length; ++i) {
					if (edps[i].identifier == edp.identifier) {
						edps.splice(i, 1);
						break;
					}
				}
			},
			getPGroups: function() {
				return inputJson.structure.performanceGroups;
			},
			addPGroup: function(name, quantity, ff, edp) {
				inputJson.structure.performanceGroups.push({
					"name": name,
					"quantity": quantity,
					"ff": ff,
					"edp": edp
				});
			},
			deletePGroup: function(pgroup){
				var pgroups = inputJson.structure.performanceGroups;
				for (var i = 0; i < pgroups.length; ++i) {
					if (pgroups[i] == pgroup) {
						pgroups.splice(i, 1);
						break;
					}
				}
			},
			getCustomFfs: function() { return inputJson.customffs; },
			setStructure: function(structure) { inputJson.structure = structure; },
			getStructure: function(){ return inputJson.structure; },
			getDemoCollapse: function() { return inputJson.demoCollapse; },
			getCalculationOptions: function() { return inputJson.calculationOptions; },
			
			getJSON: function() { return inputJson; },
			getJSONCopy: function() { return $.extend(true, {}, inputJson); },
			setJSON: function(str) { inputJson = JSON.parse(str); },
			getJSONString: function() { return JSON.stringify(inputJson, null, 2); },
			getConvertedJSONString: function() { return JSON.stringify(jsonConverter.convert(inputJson), null, 2); },
			
			sendRequest: function(callback) {
				// Define a function that will be used to poll for results.
				var timeout = 100; // milliseconds
				var poll = function() {
					// Send a GET to see whether the server has finished calculation.
					$http.get("/calculate")
					.success(function(data, status, headers, config) {
						console.log(data);
						if (data == 'calculating') {
							// Poll again later. Use exponential backoff
							// with max 5 second timeout.
							timeout = Math.min(5000, timeout * 2);
							$timeout(poll, timeout);
						} else {
							// Data is JSON, so calculation has finished.
							callback(data);
						}
					}).error(function(data, status, headers, config) {
						console.log("GET ERROR!");
						console.log(data);
					});
				}
				
				// Send the data to the server.
				$http.post("/calculate", jsonConverter.convert(inputJson))
				.success(function(data, status, headers, config) {
					console.log(data);
					$timeout(poll, timeout);
				}).error(function(data, status, headers, config) {
					console.log("POST ERROR!");
					console.log(data);
				});
			}
		}
	}]).
	factory('textParser', ['$rootScope', function($rootScope) {
	console.log('textParser service created');
		return {
			// textParser.parse: Reads in a CSV file and returns an
			// array of arrays of floats. Tab or space-separated files
			// are also supported.
			parse: function(inputText) {
				var lines = inputText.split("\n");
				var numLines = lines.length;
				var i = 0;
				var currentSelection;
				var xi;
				var yi;
				var points = [];
				var results = {};
				// Skip header line
				if (lines[i].match(/^[a-zA-Z]/g) !== null){
					i++;
				}
				for (; i < numLines; i++){
					var strip = function trim(stringToTrim) {
						return stringToTrim.replace(/^\s+|\s+$/g,"");
					};
					var line = strip(lines[i]);
					if (line.length == 0) {
						continue;
					}
					var items;
					if (line.indexOf(",") !== -1) {
						items = line.split(",");
					} else {
						items = line.match(/\S+/g);		
					};
					points.push($.map(items, parseFloat));
				}
				results["points"] = points;
				return results;
			}
		};
	}]).
	factory('distService', ['$rootScope', function($rootScope) {
		var normalCumulativeProbability = function(z) {
			var b1 =  0.31938153; 
			var b2 = -0.356563782; 
			var b3 =  1.781477937;
			var b4 = -1.821255978;
			var b5 =  1.330274429; 
			var p  =  0.2316419; 
			var c2 =  0.3989423; 
	
			if (z >  6.0) { return 1.0; }; // this guards against overflow 
			if (z < -6.0) { return 0.0; };
			var a = Math.abs(z); 
			var t = 1.0/(1.0+a*p); 
			var b = c2*Math.exp((-z)*(z/2.0)); 
			var n = ((((b5*t+b4)*t+b3)*t+b2)*t+b1)*t; 
			n = 1.0-b*n; 
			if ( z < 0.0 ) { n = 1.0 - n; }
			return n; 
		};

		var lognormalCumulativeProbability = function(x, mu, sigma) {
			return Math.min(0.9999999, Math.max(0.0000001, normalCumulativeProbability((Math.log(x) - mu) / sigma)));
		};
		
		return {
			normalCumulativeProbability: normalCumulativeProbability,
			lognormalCumulativeProbability: lognormalCumulativeProbability
		};
	}]).
	factory('rpc', ['$q', '$rootScope', function ($q, $rootScope) {
		console.log('rpc service created');
		return {
			exec: function (command) {
			
				var args = Array.prototype.slice.apply(arguments),
					deferred = $q.defer();
				
				// apply ss.rpc with array ['demoRpc.foobar', arg2, arg3], {callback}]
				ss.rpc.apply(ss, [command].concat(args.slice(1, args.length)).concat(function (err, res) {
					$rootScope.$apply(function (scope) {
						if (err) {
							return deferred.reject(err);
						}
						return deferred.resolve(res);
					});
				}));
			
				return deferred.promise;
			},

			// use cache across controllers for client-side caching
			cache: {} 
		};
	}]).
	factory('pubsub', ['$rootScope', function ($rootScope) {
		console.log('pubsub service created');
		// override the $on function
		var old$on = $rootScope.$on, json;
		Object.getPrototypeOf($rootScope).$on = function (name, listener) {
			var scope = this;
			ss.event.on(name, function (message) {
				scope.$apply(function (s) {
					if (message) {
						try {
							// broadcast with json payload
							json = JSON.parse(message);
							scope.$broadcast(name, message);
						} catch (err) {
							// broadcast with non-json payload
							scope.$broadcast(name, message);
						}
					} else {
						// broadcast with no payload (i.e. event happened)
						scope.$broadcast(name);
					}
				});
			});

			// call angular's $on version
			old$on.apply(this, arguments);
		}; // end $on redefinition
	}]).
	factory('colorService', ['$rootScope', function($rootScope) {
		return {
			makeColorMap: function() {
				function ColorMap() {
					this.colorMap = {
						"red": false,
						"blue": false,
						"green": false,
						"fuchsia": false,
						"aqua": false,
						"yellow": false,
						"purple": false,
						"teal": false,
						"olive": false,
						"navy": false,
						"lime": false,
						"maroon": false,
					};
					this.getNextColor = function() {
						for (var key in this.colorMap) {
							if (!this.colorMap[key]) {
								this.colorMap[key] = true;
								return key;
							}
						}
						// Use red as a fallback
						return "red";
					}
				}
				return new ColorMap();
			}
		}
	}]).
	factory('pathService', ['$rootScope', function($rootScope) {
		return {
			extractFilename: function(path) {
				if (path.substr(0, 12) == "C:\\fakepath\\")
					return path.substr(12); // modern browser
				var x;
				x = path.lastIndexOf('/');
				if (x >= 0) // Unix-based path
					return path.substr(x+1);
				x = path.lastIndexOf('\\');
				if (x >= 0) // Windows-based path
					return path.substr(x+1);
				return path; // just the filename
			}
		}
	}]).
	factory('jsonConverter', ['$rootScope', function($rootScope) {
		return {
			// An adapter service to convert JSON into the form expected
			// by the server.
			convert: function(obj) {
				var res = {
					"structure":{
						"performanceGroups": []
					}
				};
				
				// Copy over the IM
				var im = {
					"name": obj.im.name,
					"iMR": [],
					"minIMValue": obj.im.minIMValue,
					"maxIMValue": obj.im.maxIMValue
				};
				for (var i = 0; i < obj.im.relationships.length; ++i) {
					var imr = obj.im.relationships[i];
					
					if (imr.model.type == "IMRDiscreteModel") {
						var model_r = {};
						model_r.type = imr.model.type;
						model_r.table = imr.model.points;
						
						im.iMR.push({
							"name": imr.name,
							"epistemicWeight": imr.epistemicWeight,
							"model": model_r
						})
						
						
					} else {
					
					im.iMR.push({
						"name": imr.name,
						"epistemicWeight": imr.epistemicWeight,
						"model": imr.model
					})
					
					}
					
				}
				res.im = im;
				
				// Convert the EDPs
				var edps = [];
				for (var i = 0; i < obj.edps.length; ++i) {
					// For now, all the EDPs have one relationship of epistemic weight 1
					var oldedp = obj.edps[i];
					var newedp = {
						"name": oldedp.name,
						"identifier": oldedp.identifier,
						"edpIM": [
							{
								"name": null,
								"epistemicWeight": 1,
								"distributionFunction": oldedp.distributionFunction
							}
						],
						"minEDPValue": oldedp.minEDPValue,
						"maxEDPValue": oldedp.maxEDPValue
					};
					if (newedp.edpIM[0].distributionFunction.hasOwnProperty('rawData')) {
						delete newedp.edpIM[0].distributionFunction.rawData;
					}
					edps.push(newedp);
				}
				res.structure.edps = edps;
				
				// TODO: Copy over the components
				
				// Copy collapse stuff
				res.structure.collapse = {
					"pcim": [],
					"lossCollapse": {
						"additionalLoss": obj.demoCollapse.collapseLoss.extra,
						"meanLoss": obj.demoCollapse.collapseLoss.mean,
						"sigmaLoss": obj.demoCollapse.collapseLoss.sd,
						"epistemicStdDev_Mean_LNloss": obj.demoCollapse.collapseLoss.epistemicUncertainty,
						// Unneeded fields below
						"randMeanLoss":-99,
						"randSigmaLoss":-99,
						"additionalTime":-99,
						"epistemicStdDev_Var_LNloss":-99,
						"meanTime":-99,
						"epistemicStdDev_Mean_LNtime":-99,
						"sigmaTime":-99,
						"epistemicStdDev_Var_LNTime":-99
					}
				}
				for (var i = 0; i < obj.demoCollapse.collapseRelationships.length; ++i) {
					var oldRel = obj.demoCollapse.collapseRelationships[i];
					res.structure.collapse.pcim.push({
						"name": oldRel.name,
						"epistemicWeight": oldRel.epistemicWeight,
						"mean": oldRel.model.mean,
						"sigma": oldRel.model.sd
					});
				}
				
				// Copy demolition stuff
				res.structure.demolition = {
					"pcim": [],
					"lossCollapse": {
						"additionalLoss": obj.demoCollapse.demoLoss.extra,
						"meanLoss": obj.demoCollapse.demoLoss.mean,
						"sigmaLoss": obj.demoCollapse.demoLoss.sd,
						"epistemicStdDev_Mean_LNloss": obj.demoCollapse.demoLoss.epistemicUncertainty,
						// Unneeded fields below
						"randMeanLoss":-99,
						"randSigmaLoss":-99,
						"additionalTime":-99,
						"epistemicStdDev_Var_LNloss":-99,
						"meanTime":-99,
						"epistemicStdDev_Mean_LNtime":-99,
						"sigmaTime":-99,
						"epistemicStdDev_Var_LNTime":-99
					}
				}
				for (var i = 0; i < obj.demoCollapse.demoRelationships.length; ++i) {
					var oldRel = obj.demoCollapse.demoRelationships[i];
					res.structure.demolition.pcim.push({
						"name": oldRel.name,
						"epistemicWeight": oldRel.epistemicWeight,
						"mean": oldRel.model.mean,
						"sigma": oldRel.model.sd
					});
				}
				
				// Copy over calculation options
				res.calculationOptions = obj.calculationOptions;
				
				return res;
			}
		}
	}]);

