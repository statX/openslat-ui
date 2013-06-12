// client/code/app/controllers-main.js
module.exports = function(ngModule) {
	'use strict';

	// AppCtrl - top-level routing stuff
	ngModule.controller('AppCtrl', ['$scope', '$route', '$routeParams', function($scope, $route, $routeParams) {

		var render = function() {
				// action is something like 'home.view'
				var action = $route.current.action,
					// path becomes ['home', 'view']
					path = (action && action.split('.')) || [];

				// you can use path array to build more complex
				// views within views by having a hierarchy defined

				$scope.action = action;
				$scope.path = path;

				$scope.isHome = (path[0] === 'home');
				$scope.isIntroduction = (path[0] === 'introduction');
				$scope.isOptions = (path[0] === 'options');
				$scope.isIm = (path[0] === 'im');
				$scope.isEdp = (path[0] === 'edp');
				$scope.isStructure = (path[0] === 'structure');
				$scope.isCollapse = (path[0] === 'collapse');
				$scope.isFf = (path[0] === 'ff');
				$scope.isResults = (path[0] === 'results');
			};

		// updates whenever route changes
		$scope.$on('$routeChangeSuccess', function(scope, next, current) {
			render();
		});
	}]);

	// SaveCtrl - handles saving and loading the JSON data
	ngModule.controller('SaveCtrl', ['$scope', '$timeout', 'inputService', '$location',
																	 function($scope, $timeout, inputService, $location) {
		
		$scope.dirty = true;
		$scope.oldJSON = inputService.getJSONCopy();
		
		/*$scope.$watch('inputService.getJSON()', function() {
			$scope.dirty = true;
		});*/
		
		var updateDirtyFlag = function() {
			var newJSON = inputService.getJSONCopy();
			if (!angular.equals($scope.oldJSON, newJSON)) {
				$scope.oldJSON = newJSON;
				$scope.dirty = true;
			}
			$timeout(updateDirtyFlag, 1000);
		};
		
		$timeout(updateDirtyFlag, 1000);
		
		$scope.saveJson = function() {
			var text = inputService.getJSONString();
			
			var blob = new Blob([text], {type: "text/plain;charset=utf-8"});
			saveAs(blob, "saved_data.openslat");
			$scope.dirty = false;
		};
		
		// Called when the user loads a save file.
		$scope.handleFileSelect = function(event) {
			$scope.$apply(function($scope) {
				var f = event.target.files[0];
				if (f) {
					var r = new FileReader();
					r.onload = function(e) {
						$scope.$apply(function($scope) {
							try {
								inputService.setJSON(e.target.result);
								$scope.oldJSON = inputService.getJSONCopy();
								
								$scope.dirty = false;
								
								// Now replace the file input with a new, identical one.
								var oldInput = document.getElementById('saveFileSelect'); 
								var newInput = document.createElement('input');
								newInput.type = 'file';
								newInput.id = oldInput.id;
								oldInput.parentNode.replaceChild(newInput, oldInput);
								// Listen for changes on the new node
								document.getElementById('saveFileSelect').addEventListener('change', $scope.handleFileSelect);
								
								// Now refresh the page.
								$location.path('/#');
							} catch (err) {
								alert("Error: Invalid file format.");
							}
						});
					};
					r.readAsText(f);
				}
			});
		};
		
		document.getElementById('saveFileSelect').addEventListener('change', $scope.handleFileSelect);
		
	}]);

	
	
	// NavCtrl - bootstrap top-level navbar
	ngModule.controller('NavCtrl', ['$scope', '$location', function($scope, $location) {

		$scope.isActive = function(clicked) {
			if (!clicked) {
				return '';
			}
			var path = $location.path(),
				location = (path) ? path.substring(1) : '';

			return location === clicked ? 'active' : '';
		};

	}]);


	// ImCtrl - Im page
	ngModule.controller('ImCtrl', ['$scope', 'inputService', 'pathService', 'colorService', 'textParser', function($scope, inputService, pathService, colorService, textParser) {

		$scope.im = inputService.getIm();
		$scope.options = inputService.getCalculationOptions();
		
		$scope.graphData = {
			xAxisLabel: '',
			yAxisLabel: 'Mean Annual Rate of Exceedance',
			lines: []
		};
		
		// Enums
		$scope.PARAMETRIC = 'Parametric';
		$scope.DISCRETE = 'IMRDiscreteModel';
		$scope.POWERMODEL = 'PowerModel';
		$scope.HYPERBOLICMODEL = 'HyperbolicModel';
		
		$scope.relationshipType = null;
		$scope.parametricType = null;
		
		// Parametric, power params
		$scope.power_k0 = 2.2;
		$scope.power_k = 2.3;
		
		// Parametric, hyperbolic params
		$scope.hyperbolic_vasy = 1221;
		$scope.hyperbolic_IMasy = 27;
		$scope.hyperbolic_alpha = 65;
		
		// Discrete relationships
		$scope.discreteRelationships = [];
		
		// Initialize view to model
		if (!!$scope.im && !!$scope.im.relationships && $scope.im.relationships.length > 0) {
			var model = $scope.im.relationships[0].model;
			if (model.type == $scope.DISCRETE) {
				$scope.relationshipType = $scope.DISCRETE;
				$scope.discreteRelationships = $scope.im.relationships;
			} else {
				$scope.relationshipType = $scope.PARAMETRIC;
				$scope.parametricType = model.type;
				if (model.type == $scope.HYPERBOLICMODEL) {
					$scope.hyperbolic_vasy = model.parameters[0];
					$scope.hyperbolic_IMasy = model.parameters[1];
					$scope.hyperbolic_alpha = model.parameters[2];
				} else if (model.type == $scope.POWERMODEL) {
					$scope.power_k0 = model.parameters[0];
					$scope.power_k = model.parameters[1];
				}
			}
		}
		
		// Watch for changes in the relationship type
		$scope.$watch('relationshipType', function(newVal, oldVal) {
			$scope.displayChart(newVal, $scope.parametricType);
			$scope.updateIM();
		}, true);
		$scope.$watch('parametricType', function(newVal, oldVal) {
			$scope.displayChart($scope.relationshipType, newVal);
			$scope.updateIM();
		}, true);
		
		// Watch for parameter changes
		$scope.$watch('power_k0 + power_k + hyperbolic_vasy + hyperbolic_IMasy + hyperbolic_alpha', function(n, o) {
			$scope.displayChart($scope.relationshipType, $scope.parametricType);
			$scope.updateIM();
		});
		
		// Watch for discrete relationship changes
		$scope.$watch('discreteRelationships.length', function(n, o) {
			$scope.displayChart($scope.relationshipType, $scope.parametricType);
			$scope.updateIM();
		});
		
		// Watch for IM name changes
		$scope.$watch('im.name', function(newName, oldName) {
			$scope.graphData.xAxisLabel = newName;
		});
		
		// Update the chart with the currently selected relationship.
		$scope.displayChart = function(relationshipType, parametricType) {
			if (relationshipType == $scope.PARAMETRIC) {
				if (parametricType == $scope.POWERMODEL) {
					var line = $scope.makePowerModelLine($scope.power_k0, $scope.power_k);
					$scope.graphData.lines = [line];
				} else if (parametricType == $scope.HYPERBOLICMODEL) {
					var line = $scope.makeHyperbolicModelLine($scope.hyperbolic_vasy, $scope.hyperbolic_IMasy, $scope.hyperbolic_alpha);
					$scope.graphData.lines = [line];
				}
			} else if (relationshipType == $scope.DISCRETE) {
				var lines = [];
				for (var i = 0; i < $scope.discreteRelationships.length; ++i) {
					lines.push($scope.makeDiscreteLine('Relationship ' + (i + 1), $scope.discreteRelationships[i].model.points));
				}
				$scope.graphData.lines = lines;
			}
		};
		
		// Determines whether the IM relationship is complete.
		$scope.isIMComplete = function() {
			if ($scope.relationshipType == $scope.PARAMETRIC) {
				if ($scope.parametricType == $scope.POWERMODEL) {
					return $scope.power_k0 != null && $scope.power_k != null;
				} else if ($scope.parametricType == $scope.HYPERBOLICMODEL) {
					return $scope.hyperbolic_vasy != null && $scope.hyperbolic_IMasy != null && $scope.hyperbolic_alpha != null;
				}
			} else if ($scope.relationshipType == $scope.DISCRETE) {
				return $scope.discreteRelationships.length > 0;
			}
			return false;
		};
		
		// Update the IM in the JSON object with the currently entered data.
		$scope.updateIM = function() {
			if ($scope.relationshipType == $scope.PARAMETRIC) {
				if ($scope.parametricType == $scope.POWERMODEL) {
					$scope.im.relationships = [{
						name: 'Power Model',
						epistemicWeight: 1.0,
						model: {
							"type": $scope.POWERMODEL,
							"parameters": [$scope.power_k0, $scope.power_k]
						}
					}];
				} else if ($scope.parametricType == $scope.HYPERBOLICMODEL) {
					$scope.im.relationships = [{
						name: 'Hyperbolic Model',
						epistemicWeight: 1.0,
						model: {
							"type": $scope.HYPERBOLICMODEL,
							"parameters": [$scope.hyperbolic_vasy, $scope.hyperbolic_IMasy, $scope.hyperbolic_alpha]
						}
					}];
				}
			} else if ($scope.relationshipType == $scope.DISCRETE) {
				$scope.im.relationships = $scope.discreteRelationships;
			}
		};

		$scope.makePowerModelLine = function(k0, k) {
			var func = function(x) {
				return k0 / Math.pow(x, k);
			};
			var xmin = Math.exp(-5.5);
			var xmax = Math.exp(0.5);
			// TODO: Calculate these properly rather than using constants
			return {
				"name": 'Power Model',
				"isDiscrete": false,
				"func": func,
				"limits": {
					xmin: xmin,
					xmax: xmax,
					ymin: Math.min(func(xmin),func(xmax)),
					ymax: Math.max(func(xmin),func(xmax))
				}
			};
		};

		$scope.makeHyperbolicModelLine = function(vasy, IMasy, alpha, parameters) {
			var func = function(x) {
				return vasy * Math.exp(alpha / (Math.log(x / IMasy)));
			};
			// TODO: Calculate these properly rather than using constants
			var xmin = Math.exp(-5.5);
			var xmax = Math.exp(0.5);
			return {
				"name": 'Hyperbolic Model',
				"isDiscrete": false,
				"func": func,
				"limits": {
					xmin: xmin,
					xmax: xmax,
					ymin: Math.min(func(xmin),func(xmax)),
					ymax: Math.max(func(xmin),func(xmax))
				}
			};
		};
		
		$scope.makeDiscreteLine = function(name, points) {
			return {
				"name": name,
				"data": points,
				"isDiscrete": true
			};
		};
		
		$scope.removeDiscreteRel = function(idx) {
			$scope.discreteRelationships.splice(idx, 1);
		};
		
		// Called when the user selects a new discrete relationship file.
		$scope.handleFileSelect = function(event) {
			$scope.$apply(function($scope) {
				var f = event.target.files[0];
				if (f) {
					var filename = pathService.extractFilename(event.target.value);
					var r = new FileReader();
					r.onload = function(e) {
						$scope.$apply(function($scope) {
							try {
								var results = textParser.parse(e.target.result);
								$scope.discreteRelationships.push({
									name: filename,
									epistemicWeight: 1.0,
									model: {
										type: $scope.DISCRETE,
										points: results.points
									}
								});
								
								// Now replace the file input with a new, identical one.
								var oldInput = document.getElementById('imFileSelect'); 
								var newInput = document.createElement('input');
								newInput.type = 'file';
								newInput.id = oldInput.id;
								oldInput.parentNode.replaceChild(newInput, oldInput);
								// Listen for changes on the new node
								document.getElementById('imFileSelect').addEventListener('change', $scope.handleFileSelect);
							} catch (err) {
								alert("Error: Invalid file format.");
							}
						});
					};
					r.readAsText(f);
				}
			});
		};
		
		document.getElementById('imFileSelect').addEventListener('change', $scope.handleFileSelect);
	}]);
	
	
	// EdpCtrl - Response page
	ngModule.controller('EdpCtrl', ['$scope', 'rpc', 'pubsub', 'inputService', 'pathService', 'textParser', function($scope, rpc, pubsub, inputService, pathService, textParser) {
		
		$scope.PARAMETRIC = 'LogNormalModel';
		$scope.DISCRETE = 'EDPIMDiscreteModel';
		$scope.POWERMODEL = 'PowerModel';
		$scope.HYPERBOLICMODEL = 'HyperbolicModel';
		$scope.ASLANIMODEL = 'AslaniModel';
		$scope.PARABOLICMODEL = 'ParabolicModel';
		$scope.MEANSDFORMAT = 'MeanDispersion';
		$scope.RAWDATAFORMAT = 'RawData';
		
		$scope.im = inputService.getIm();
		$scope.edps = inputService.getEdps();
		$scope.options = inputService.getCalculationOptions();

		$scope.edpid = null;
		$scope.edpname = '';
		$scope.relationshipType = '';
		$scope.meanParametricType = '';
		$scope.sdParametricType = '';
		$scope.discreteInputFormat = '';
		
		// Discrete data
		$scope.discreteData = null;
		$scope.extraPoints = null;
		
		// Mean parameters
		$scope.meanpower_a = null;
		$scope.meanpower_b = null;
		$scope.meanaslani_a1 = null;
		$scope.meanaslani_a2 = null;
		$scope.meanaslani_a3 = null;
		// Dispersion (s.d.) parameters
		$scope.sdpower_a = '';
		$scope.sdpower_b = '';
		$scope.sdparabolic_b1 = '';
		$scope.sdparabolic_b2 = '';
		$scope.sdparabolic_b3 = '';
		
		// Output range data
		$scope.minEDPValue = 0;
		$scope.maxEDPValue = 1;
		
		// Graph data
		$scope.newEdpGraphData = {
			xAxisLabel: $scope.im.name,
			yAxisLabel: $scope.edpname,
			lines: []
		};
		
		// Watch for IM name changes
		$scope.$watch('im.name', function(newName, oldName) {
			$scope.newEdpGraphData.xAxisLabel = newName;
		});
		
		// Watch for EDP name changes
		$scope.$watch('edpname', function(newName, oldName) {
			$scope.newEdpGraphData.yAxisLabel = newName;
		});
		
		// Watch for discrete data changes
		$scope.$watch('discreteData', function(n, o) {
			$scope.displayChart($scope.relationshipType, $scope.meanParametricType, $scope.sdParametricType);
		});
		
		// Watch for parameter changes
		$scope.$watch('meanpower_a + meanpower_b + meanaslani_a1 + meanaslani_a2 + meanaslani_a3 + sdpower_a + sdpower_b + sdparabolic_b1 + sdparabolic_b2 + sdparabolic_b3', function(n, o) {
			$scope.displayChart($scope.relationshipType, $scope.meanParametricType, $scope.sdParametricType);
		});
		
		// Update the chart with the currently selected relationship.
		$scope.displayChart = function(relationshipType, meanParametricType, sdParametricType) {
			var lines = [];
			if (relationshipType == $scope.DISCRETE) {
				if ($scope.discreteData != null) {
					// Iterate over the discrete data and convert it into three lines.
					var meanline = {
						name: "Mean",
						isDiscrete: true,
						data: []
					};
					var upper = {
						name: "84th percentile",
						isDiscrete: true,
						data: []
					};
					var lower = {
						name: "16th percentile",
						isDiscrete: true,
						data: []
					};
					
					for (var i = 0; i < $scope.discreteData.length; ++i) {
						var datum = $scope.discreteData[i];
						meanline.data.push([datum[0], datum[1]]);
						var mu = datum[1];
						var sigma = datum[2];
						var x84 = mu*Math.exp(sigma-sigma*sigma/2.0);
						var x16 = mu*Math.exp(-sigma-sigma*sigma/2.0);
						upper.data.push([datum[0], x84]);
						lower.data.push([datum[0], x16]);
					}
					
					// If there are extra points to display, process them and add to the mean line.
					if (!!$scope.extraPoints) {
						meanline.extraPoints = [];
						for (var i = 0; i < $scope.extraPoints.length; ++i) {
							var pointarray = $scope.extraPoints[i];
							for (var j = 1; j < pointarray.length; ++j) {
								// Skip zero measurements
								if (pointarray[j] == 0) {
									continue;
								}
								meanline.extraPoints.push([pointarray[0], pointarray[j]]);
							}
						}
					}
					
					lines.push(upper);
					lines.push(meanline);
					lines.push(lower);
				}
			} else if (relationshipType == $scope.PARAMETRIC) {
				var func = null;
				if (meanParametricType == $scope.POWERMODEL && $scope.meanpower_a != '' && $scope.meanpower_b != '') {
					func = function(x) {
						return $scope.meanpower_a * Math.pow(x, $scope.meanpower_b);
					};
				} else if (meanParametricType == $scope.ASLANIMODEL && $scope.meanaslani_a1 != '' && $scope.meanaslani_a2 != '' && $scope.meanaslani_a3 != '') {
					func = function(x) {
						return $scope.meanaslani_a1 * Math.pow($scope.meanaslani_a2, x) * Math.pow(x, $scope.meanaslani_a3);
					};
				}
				// If there's a mean line and we've defined dispersion, add lines for that too
				if (func != null) {
					// TODO: Calculate these properly rather than using constants
					var xmin = Math.exp(-5.5);
					var xmax = Math.exp(0);
					var sdfunc = null;
					if (sdParametricType == $scope.POWERMODEL && $scope.sdpower_a != '' && $scope.sdpower_b != '') {
						sdfunc = function(x) {
							return $scope.sdpower_a * Math.pow(x, $scope.sdpower_b);
						};
					} else if (sdParametricType == $scope.PARABOLICMODEL && $scope.sdparabolic_b1 != '' && $scope.sdparabolic_b2 != '' && $scope.sdparabolic_b3 != '') {
						sdfunc = function(x) {
							return parseFloat($scope.sdparabolic_b1) + $scope.sdparabolic_b2 * x + $scope.sdparabolic_b3 * x * x;
						};
					}
					if (sdfunc != null) {
						lines.push($scope.makeParametricLine("84th percentile", function(x) {
							var mu = func(x);
							var sigma = sdfunc(x);
							var x84 = mu * Math.exp(sigma - sigma*sigma/2.0);
							return x84;
						}, xmin, xmax));
					}
					lines.push($scope.makeParametricLine("Parametric relationship", func, xmin, xmax));
					if (sdfunc != null) {
						lines.push($scope.makeParametricLine("16th percentile", function(x) {
							var mu = func(x);
							var sigma = sdfunc(x);
							var x16 = mu * Math.exp(-sigma - sigma*sigma/2.0);
							return x16;
						}, xmin, xmax));
					}
				}
			}
			$scope.newEdpGraphData.lines = lines;
			
		};
		
		$scope.makeParametricLine = function(name, func, xmin, xmax) {
			return {
				"name": name,
				"isDiscrete": false,
				"func": func,
				"limits": {
					xmin: xmin,
					xmax: xmax,
					ymin: Math.min(func(xmin),func(xmax)),
					ymax: Math.max(func(xmin),func(xmax))
				}
			};
		};
		
		$scope.newEdpValid = function() {
			if (!$scope.edpname) { return false; }
			if ($scope.relationshipType == $scope.PARAMETRIC) {
				var valid = true;
				if ($scope.meanParametricType == $scope.POWERMODEL) {
					valid = valid && $scope.meanpower_a !== '' && $scope.meanpower_b !== '';
				} else if ($scope.meanParametricType == $scope.ASLANIMODEL) {
					valid = valid && $scope.meanaslani_a1 !== '' && $scope.meanaslani_a2 !== '' && $scope.meanaslani_a3 !== '';
				} else {
					valid = false;
				}
				
				if ($scope.sdParametricType == $scope.POWERMODEL) {
					valid = valid && $scope.sdpower_a !== '' && $scope.sdpower_b !== '';
				} else if ($scope.sdParametricType == $scope.PARABOLICMODEL) {
					valid = valid && $scope.sdparabolic_b1 !== '' && $scope.sdparabolic_b2 !== '' && $scope.sdparabolic_b3 !== '';
				} else {
					valid = false;
				}
				
				return valid;
			} else if ($scope.relationshipType == $scope.DISCRETE) {
				return $scope.discreteData != null;
			}
			return false;
		}
		
		$scope.addEdp = function() {
			if ($scope.newEdpValid()) {
				var edp;
				if ($scope.relationshipType == $scope.PARAMETRIC) {
					var meanModel = {
						type: $scope.meanParametricType
					};
					var sdModel = {
						type: $scope.sdParametricType
					};
					edp = {
						identifier: $scope.edpid,
						name: $scope.edpname,
						distributionFunction: {
							type: $scope.relationshipType,
							meanModel: meanModel,
							stddModel: sdModel
						},
						"minEDPValue":$scope.minEDPValue,
						"maxEDPValue":$scope.maxEDPValue
					};
					// Set the mean parameters
					if ($scope.meanParametricType == $scope.POWERMODEL) {
						meanModel.parameters = [$scope.meanpower_a, $scope.meanpower_b];
					} else if ($scope.meanParametricType == $scope.ASLANIMODEL) {
						meanModel.parameters = [$scope.meanaslani_a1, $scope.meanaslani_a2, $scope.meanaslani_a3];
					}
					// Set the dispersion parameters
					if ($scope.sdParametricType == $scope.POWERMODEL) {
						sdModel.parameters = [$scope.sdpower_a, $scope.sdpower_b];
					} else if ($scope.sdParametricType == $scope.PARABOLICMODEL) {
						sdModel.parameters = [$scope.sdparabolic_b1, $scope.sdparabolic_b2, $scope.sdparabolic_b3]
					}
				} else {
					// Store discrete data
					edp = {
						identifier: $scope.edpid,
						name: $scope.edpname,
						distributionFunction: {
							type: $scope.relationshipType,
							table: $scope.discreteData,
							rawData: false
						},
						"minEDPValue":$scope.minEDPValue,
						"maxEDPValue":$scope.maxEDPValue
					};
					if ($scope.discreteInputFormat == $scope.RAWDATAFORMAT) {
						edp.distributionFunction.table = $scope.extraPoints;
						edp.distributionFunction.rawData = true;
					}
				}
				inputService.addEdp(edp);
				
				// Clear data fields
				$scope.edpid = null;
				$scope.edpname = $scope.relationshipType = $scope.meanParametricType = $scope.sdParametricType = '';
				$scope.discreteData = null;
				$scope.meanpower_a = $scope.meanpower_b = $scope.meanaslani_a1 = $scope.meanaslani_a2 = $scope.meanaslani_a3 = $scope.sdpower_a = $scope.sdpower_b = $scope.sdparabolic_b1 = $scope.sdparabolic_b2 = $scope.sdparabolic_b3 = '';
			}
		}
		
		$scope.editEdp = function(edp) {
			$scope.edpid = edp.identifier;
			$scope.edpname = edp.name;
			$scope.minEDPValue = edp.minEDPValue;
			$scope.maxEDPValue = edp.maxEDPValue;
			
			if (edp.distributionFunction.type == $scope.DISCRETE) {
				// Deal with discrete data sets
				$scope.relationshipType = $scope.DISCRETE;
				if (edp.distributionFunction.rawData) {
					$scope.processDiscreteData(edp.distributionFunction.table);
				} else {
					$scope.discreteData = edp.distributionFunction.table;
				}
			} else if (edp.distributionFunction.type == $scope.PARAMETRIC) {
				$scope.relationshipType = $scope.PARAMETRIC;
				
				var meanModel = edp.distributionFunction.meanModel;
				var sdModel = edp.distributionFunction.stddModel;
				
				// Set the mean parameters
				$scope.meanParametricType = meanModel.type;
				if (meanModel.type == $scope.POWERMODEL) {
					$scope.meanpower_a = meanModel.parameters[0];
					$scope.meanpower_b = meanModel.parameters[1];
				} else if (meanModel.type == $scope.ASLANIMODEL) {
					$scope.meanaslani_a1 = meanModel.parameters[0];
					$scope.meanaslani_a2 = meanModel.parameters[1];
					$scope.meanaslani_a3 = meanModel.parameters[2];
				}
				
				// Set the dispersion parameters
				$scope.sdParametricType = sdModel.type;
				if (sdModel.type == $scope.POWERMODEL) {
					$scope.sdpower_a = sdModel.parameters[0];
					$scope.sdpower_b = sdModel.parameters[1];
				} else if (sdModel.type == $scope.PARABOLICMODEL) {
					$scope.sdparabolic_b1 = sdModel.parameters[0];
					$scope.sdparabolic_b2 = sdModel.parameters[1];
					$scope.sdparabolic_b3 = sdModel.parameters[2];
				}
			}
			
			$scope.deleteEdp(edp);
		};
		
		$scope.deleteEdp = function(edp) {
			inputService.deleteEdp(edp);
		};
		
		$scope.deleteEdpConfirm = function(edp) {
			if (confirm("Are you sure you want to delete \"" + edp.name + "\"?")) {
				$scope.deleteEdp(edp);
			}
		};
		
		$scope.processDiscreteData = function(points) {
			if ($scope.discreteInputFormat == $scope.MEANSDFORMAT) {
				$scope.discreteData = points;
				$scope.extraPoints = null;
			} else if ($scope.discreteInputFormat == $scope.RAWDATAFORMAT) {
				// We need to calculate the mean and lognormal SD for each array of points.
				$scope.extraPoints = points;
				var data = [];
				for (var i = 0; i < points.length; ++i) {
					var point = points[i];
					var x = point[0];
					var meanln = 0;
					var sdln = 0;
					var mean = 0;
					var N = point.length - 1;
					
					// Iterate over all the measurements for this point to find the mean.
					// Ignore zeroes.
					for (var j = 1; j < point.length; ++j) {
						if (point[j] == 0) {
							N--;
							continue;
						}
						meanln += Math.log(point[j]);
					}
					meanln /= N;
					
					// Iterate over all the measurements for this point to find the S.D.
					for (var j = 1; j < point.length; ++j) {
						if (point[j] == 0) {
							continue;
						}
						var a = Math.log(point[j]) - meanln;
						sdln += a*a;
					}
					sdln = Math.sqrt(sdln / (N - 1));
					
					// Calculate Mean[EDP|IM]
					mean = Math.exp(meanln + sdln * sdln / 2.0);
					data.push([x, mean, sdln]);
				}
				$scope.discreteData = data;
			}
		}
		
		// Called when the user selects a new discrete relationship file.
		$scope.handleFileSelect = function(event) {
			$scope.$apply(function($scope) {
				var f = event.target.files[0];
				if (f) {
					var filename = pathService.extractFilename(event.target.value);
					var r = new FileReader();
					r.onload = function(e) {
						$scope.$apply(function($scope) {
							try {
								var results = textParser.parse(e.target.result);
								$scope.processDiscreteData(results.points);
								
								// Now replace the file input with a new, identical one.
								var oldInput = document.getElementById('edpFileSelect'); 
								var newInput = document.createElement('input');
								newInput.type = 'file';
								newInput.id = oldInput.id;
								oldInput.parentNode.replaceChild(newInput, oldInput);
								// Listen for changes on the new node
								document.getElementById('edpFileSelect').addEventListener('change', $scope.handleFileSelect);
							} catch (err) {
								alert("Error: Invalid file format.");
							}
						});
					};
					r.readAsText(f);
				}
			});
		};
		
		document.getElementById('edpFileSelect').addEventListener('change', $scope.handleFileSelect);
		
	}]);
	

	// StructureCtrl - Structure page
	ngModule.controller('StructureCtrl', ['$scope', 'rpc', 'pubsub', '$http', 'inputService', function($scope, rpc, pubsub, $http, inputService) {
		var newFF = {
			'identifier': 0,
			'name': "Create new..."
		};
		
		$http.get('/getff').
		success(function(data) {
			var libraryFFs = data.fragilityfunctions;
			var customFFs = inputService.getCustomFfs();
			$scope.ff = [newFF].concat(libraryFFs, customFFs);
		});

		$scope.edps = inputService.getEdps();
		$scope.pgroups = inputService.getPGroups();
		
		$scope.damagestates = [];
		
		$scope.ffFormValid = function() {
			return !!$scope.customFfName;
		};
		
		$scope.pgroupFormValid = function() {
			return !!$scope.pgroupName && $scope.pgroupQuantity > 0 && !!$scope.pgroupFF && $scope.pgroupEDP != null;
		};
		
		$scope.getFFName = function(id) {
			if (!$scope.ff) { return "Loading..." };
			for (var i = 0; i < $scope.ff.length; ++i) {
				if ($scope.ff[i].identifier == id) {
					return $scope.ff[i].name;
				}
			}
			return 'ERROR: Non-existent component type';
		};
		
		$scope.getEdpName = function(id) {
			var edp = inputService.getEdp(id);
			if (edp) {
				return edp.name;
			} else {
				return 'ERROR: Non-existent EDP';
			}
		};

		$scope.addPGroup = function() {
			// Add a new performance group.
			inputService.addPGroup($scope.pgroupName, $scope.pgroupQuantity, $scope.pgroupFF, $scope.pgroupEDP);
			$scope.pgroupName = $scope.pgroupQuantity = $scope.pgroupFF = $scope.pgroupEDP = null;
		};
		
		$scope.editPGroup = function(pgroup) {
			$scope.pgroupName = pgroup.name;
			$scope.pgroupQuantity = pgroup.quantity;
			$scope.pgroupFF = pgroup.ff;
			$scope.pgroupEDP = pgroup.edp;
			$scope.deletePGroup(pgroup);
		};
		
		$scope.deletePGroup = function(pgroup) {
			inputService.deletePGroup(pgroup);
		};
		
		$scope.deletePGroupConfirm = function(pgroup) {
			if (confirm("Are you sure you want to delete \"" + pgroup.name + "\"?")) {
				$scope.deletePGroup(pgroup);
			}
		};
	}]);

	// CollapseCtrl - Global Collapse page
	ngModule.controller('CollapseCtrl', ['$scope', 'rpc', 'pubsub', 'inputService', 'colorService', 'pathService', 'textParser', 'distService',
			function($scope, rpc, pubsub, inputService, colorService, pathService, textParser, distService) {
		
		// Enums
		$scope.PARAMETRIC = 'LogNormalModel';
		$scope.DISCRETE = 'DiscreteModel';
		$scope.AUTOMATIC = 'Automatic';
		$scope.MANUAL = 'Manual';
		
		$scope.demoCollapse = inputService.getDemoCollapse();
		
		$scope.relationshipType = null;
		// Initialize the relationship type from the model.
		// For now, we use either parametric or discrete for all the relationships,
		// but the model can have relationships with different types. So here, we
		// just take the type of the first relationship in the array.
		if ($scope.demoCollapse && _.size($scope.demoCollapse.demoRelationships) > 0) {
			$scope.relationshipType = $scope.demoCollapse.demoRelationships[0].model.type;
		} else if ($scope.demoCollapse && _.size($scope.demoCollapse.collapseRelationships) > 0) {
			$scope.relationshipType = $scope.demoCollapse.collapseRelationships[0].model.type;
		}
		
		// Parameters for parametric (log-normal) model for demolition
		$scope.demolition_mean = null;
		$scope.demolition_sd = null;
		
		// Parameters for parametric (log-normal) model for collapse
		$scope.collapse_mean = null;
		$scope.collapse_sd = null;
		
		$scope.im = inputService.getIm();
		
		$scope.demolitionRelationships = $scope.demoCollapse.demoRelationships;
		$scope.collapseRelationships = $scope.demoCollapse.collapseRelationships;
		$scope.graphData = {
			xAxisLabel: $scope.im.name,
			yAxisLabel: 'Probability of Collapse',
			lines: []
		};
		
		// Watch for relationship changes
		$scope.$watch('demolitionRelationships.length + collapseRelationships.length', function(n, o) {
			$scope.displayChart();
		});
		
		// Update the chart with the currently selected relationship.
		$scope.displayChart = function() {
			var lines = [];
			// Demolition relationships
			for (var i = 0; i < $scope.demolitionRelationships.length; ++i) {
				var rel = $scope.demolitionRelationships[i];
				if (rel.model.type == $scope.DISCRETE) {
					lines.push($scope.makeDiscreteLine('Demolition Rel ' + (i + 1), rel.model.points));
				} else if (rel.model.type == $scope.PARAMETRIC) {
					lines.push($scope.makeLogNormalLine('Demolition Rel ' + (i + 1), rel.model.mean, rel.model.sd));
				}
			}
			// Collapse relationships
			for (var i = 0; i < $scope.collapseRelationships.length; ++i) {
				var rel = $scope.collapseRelationships[i];
				if (rel.model.type == $scope.DISCRETE) {
					lines.push($scope.makeDiscreteLine('Collapse Rel ' + (i + 1), rel.model.points));
				} else if (rel.model.type == $scope.PARAMETRIC) {
					lines.push($scope.makeLogNormalLine('Collapse Rel ' + (i + 1), rel.model.mean, rel.model.sd));
				}
			}
			$scope.graphData.lines = lines;
		};
		
		$scope.makeLogNormalLine = function(name, mean, sd) {
			var meanln = Math.log(mean) - sd*sd/2.0;
			var x_lowerlimit = Math.max(0.000001, Math.exp(meanln - sd*4));
			var x_upperlimit = Math.exp(meanln + sd*4);
			
			// TODO: Figure out limits somehow
			//var x_lowerlimit = 0;
			//var x_upperlimit = 5;

			return {
				"name": name,
				"isDiscrete": false,
				"func": function(i) {
					return distService.lognormalCumulativeProbability(i, meanln, sd);
				},
				"limits": {
					xmin: x_lowerlimit,
					xmax: x_upperlimit,
					ymin: 0.0,
					ymax: 1.0
				},
			};
		};
		
		$scope.makeDiscreteLine = function(name, points) {
			return {
				"name": name,
				"isDiscrete": true,
				"data": points
			};
		};
		
		$scope.removeDemolitionRel = function(idx) {
			$scope.demolitionRelationships.splice(idx, 1);
		};
		
		$scope.removeCollapseRel = function(idx) {
			$scope.collapseRelationships.splice(idx, 1);
		};
		
		$scope.demolitionFormValid = function() {
			return $scope.demolition_mean != null && $scope.demolition_sd != null;
		};
		
		$scope.addDemolitionRelationship = function() {
			$scope.demolitionRelationships.push({
				name: 'Demolition Relationship',
				epistemicWeight: 1.0,
				model: {
					type: $scope.PARAMETRIC,
					mean: parseFloat($scope.demolition_mean),
					sd: parseFloat($scope.demolition_sd)
				}
			});
			$scope.demolition_mean = null;
			$scope.demolition_sd = null;
		};
		
		$scope.collapseFormValid = function() {
			return $scope.collapse_mean != null && $scope.collapse_sd != null;
		};
		
		$scope.addCollapseRelationship = function() {
			$scope.collapseRelationships.push({
				name: 'Collapse Relationship',
				epistemicWeight: 1.0,
				model: {
					type: $scope.PARAMETRIC,
					mean: parseFloat($scope.collapse_mean),
					sd: parseFloat($scope.collapse_sd)
				}
			});
			$scope.collapse_mean = null;
			$scope.collapse_sd = null;
		};
		
		// Called when the user selects a new discrete relationship file.
		$scope.handleFileSelect = function(elemid, relarray, event) {
			$scope.$apply(function($scope) {
				var f = event.target.files[0];
				if (f) {
					var filename = pathService.extractFilename(event.target.value);
					var r = new FileReader();
					r.onload = function(e) {
						$scope.$apply(function($scope) {
							try {
								var results = textParser.parse(e.target.result);
								relarray.push({
									name: filename,
									epistemicWeight: 1.0,
									model: {
										type: $scope.DISCRETE,
										points: results.points
									}
								});
								
								// Now replace the file input with a new, identical one.
								var oldInput = document.getElementById(elemid); 
								var newInput = document.createElement('input');
								newInput.type = 'file';
								newInput.id = oldInput.id;
								oldInput.parentNode.replaceChild(newInput, oldInput);
								// Listen for changes on the new node
								document.getElementById(elemid).addEventListener('change', _.partial($scope.handleFileSelect, elemid, relarray));
							} catch (err) {
								alert("Error: Invalid file format.");
							}
						});
					};
					r.readAsText(f);
				}
			});
		};
		
		document.getElementById('demoFileSelect').addEventListener('change', _.partial($scope.handleFileSelect, 'demoFileSelect', $scope.demolitionRelationships));
		
		document.getElementById('collapseFileSelect').addEventListener('change', _.partial($scope.handleFileSelect, 'collapseFileSelect', $scope.collapseRelationships));
	}]);

	// FfCtrl - Fragility Function page
	ngModule.controller('FfCtrl', ['$scope', 'rpc', 'pubsub', '$http', function($scope, rpc, pubsub, $http) {
		$http.get('/getff').
		success(function(data) {
			$scope.ff = data.fragilityfunctions;
		});

		$scope.filterText = "";
		$scope.textMatch = function(item) {
			return item.name.toLowerCase().indexOf($scope.filterText.toLowerCase()) !== -1;
		};

	}]);

	// ResultsCtrl - Calculate/Results page
	ngModule.controller('ResultsCtrl', ['$scope', 'rpc', 'pubsub', '$http', 'inputService', function($scope, rpc, pubsub, $http, inputService) {
		$scope.im = inputService.getIm();
		$scope.edps = inputService.getEdps();
		
		// Enums for request state
		$scope.REQUEST_NOT_SENT = 0;
		$scope.REQUEST_PENDING = 1;
		$scope.REQUEST_COMPLETE = 2;
		
		$scope.inputJson = function() {
			return inputService.getConvertedJSONString();
		};
		$scope.outputJson = '';
		
		$scope.options = inputService.getCalculationOptions();
		
		// Results returned from the server
		$scope.results = {};
		
		$scope.availableEdpLines = [];
		$scope.edpHazardGraphData = {
			xAxisLabel: 'EDP value',
			yAxisLabel: 'Annual Rate of Exceedance',
			lines: []
		};
		
		$scope.calculationStatus = $scope.REQUEST_NOT_SENT;

		// Watch for EDP line array changes
		$scope.$watch('availableEdpLines', function(n, o) {
			$scope.updateEdpChart();
		});
		
		// Returns "" if demolition hazard is available to be calculated.
		// Otherwise, returns the reason why not, in parentheses.
		$scope.demoHazardAvailable = function() {
			// TODO (and in the other "available" methods):
			// Do a deep verify of the IM and other structures. Probably
			// requires a service.
			if (!$scope.im) {
				return "(Intensity measure undefined. Please complete the Seismic Hazard section.)"
			}
			return "";
		}
		
		// Returns "" if collapse hazard is available to be calculated.
		// Otherwise, returns the reason why not, in parentheses.
		$scope.collapseHazardAvailable = function() {
			if (!$scope.im) {
				return "(Intensity measure undefined. Please complete the Seismic Hazard section.)"
			}
			return "";
		}
		
		// Returns "" if EDP hazard is available to be calculated.
		// Otherwise, returns the reason why not, in parentheses.
		$scope.edpHazardAvailable = function() {
			if (!$scope.im) {
				return "(Intensity measure undefined. Please complete the Seismic Hazard section.)"
			} else if (!$scope.edps) {
				return "(No engineering demand parameters defined. Please complete the Seismic Response section.)"
			}
			return "";
		}
		
		$scope.updateEdpChart = function() {
			var lines = [];
			for (var i = 0; i < $scope.availableEdpLines.length; ++i) {
				var line = $scope.availableEdpLines[i];
				if (line.plot) {
					lines.push(line);
				}
			}
			$scope.edpHazardGraphData.lines = lines;
		};
		
		$scope.calculationValid = function() {
			// Check that some calculation was selected
			if (($scope.options.demolitionRateCalc
					|| $scope.options.collapseRateCalc
					|| $scope.options.edpRateCalc) == false) {
				return false;
			}
			
			// TODO: Make sure all of the required options are filled in
			return true;
		}
		
		$scope.calculate = function() {
			// Send request to server and start periodically polling for results.
			$scope.calculationStatus = $scope.REQUEST_PENDING;
			// TODO: Set calculation options
			inputService.sendRequest(function(result) {
				$scope.outputJson = JSON.stringify(result, null, 2);
				$scope.results = result;
				$scope.processResults(result);
				$scope.calculationStatus = $scope.REQUEST_COMPLETE;
			});
		}
		
		$scope.processResults = function(results) {
			// Build EDP hazard graph
			if (!!results.edprOutput.edpRates) {
				var lines = [];
				for (var i = 0; i < results.edprOutput.edpRates.length; ++i) {
					var edpres = results.edprOutput.edpRates[i];
					var points = [];
					for (var j = 0; j < edpres.x.length; ++j) {
						points.push([edpres.x[j],edpres.y[j]]);
					}
					var line = {
						"name": edpres.name,
						"data": points,
						"isDiscrete": true,
						"plot": i == 0
					};
					lines.push(line);
				}
				$scope.availableEdpLines = lines;
			}
			if (!!results.collapseOutput) {
				if (results.collapseOutput.rate > 0){
					$scope.results.collapseRate =  results.collapseOutput.rate.toExponential();
				} else {
				    $scope.results.collapseRate = -99;
				}
			}
			if (!!results.demolitionOutput) {
				if (results.demolitionOutput.rate > 0){
					$scope.results.demolitionRate = results.demolitionOutput.rate.toExponential();
				} else {
					$scope.results.demolitionRate  = -99;
				}
			}
		}
	}]);
};