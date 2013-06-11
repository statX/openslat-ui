/*global angular */
// client/code/app/directives
/* AngularJS directives */
angular.module('app.directives', [])
	.directive('buttonsRadio', function() {
	return {
		restrict: 'E',
		scope: { model: '=', values:'&', labels:'&' },
		controller: function($scope){
			$scope.activate = function(option){
				$scope.model = option;
			};      
		},
		template: "<button type='button' class='btn' " +
								"ng-repeat='value in values()' " +
								"ng-class='{active: value == model}'" +
								"ng-click='activate(value)'>{{labels()[$index]}} " +
							"</button>"
	};
}).directive('chart', ['colorService', function (colorService) {
		//var margin = 20, width = 960 - margin.left - margin.right, height = 500 - margin.top - margin.bottom;
	
	// Constants
	var SCALE_LINEAR = 'linear';
	var SCALE_LOG = 'log';
	var SCALE_POWER = 'pow';

	return {
		restrict: 'E',
		replace: true,
		scope: {
			data: '='
		},
		compile: function compile(element, attrs) {
			
			var width = attrs.width || '100%';
			var height = attrs.height || '620px';
			var id = attrs.id || "mygraph";
			var scale = attrs.scale || SCALE_LOG;
			var htmlText = '<div id="' + id + '" style="position:relative;width:' + width + ';height:' + height + '"></div>'
			element.replaceWith(htmlText);
			
			return function link(scope, element, attrs) {
				scope.$watch('data', function (newVal, oldVal) {
					$('#' + id).empty();
					
					if (!!newVal && !!newVal.lines && newVal.lines.length > 0){
						var discrete = $.map(newVal.lines, function(val, i) {
							return val.isDiscrete;
						});
						var values = $.map(newVal.lines, function(val, i) {
							if (val.isDiscrete) {
								return [val.data];
							} else {
								var x_lowerlimit = val.limits.xmin;
								var x_upperlimit = val.limits.xmax;
								var points = d3.range(x_lowerlimit, x_upperlimit, (x_upperlimit - x_lowerlimit)/500.0)
									.map(function(x) {
										return [x, val.func(x)];
									});
								return [points];
							}
						});
						var extraPoints = $.map(newVal.lines, function(val, i) {
							return [val.extraPoints];
						});
						var names = $.map(newVal.lines, function(val, i) {
							return [val.name];
						});
						var colorMap = colorService.makeColorMap();
						var colors = $.map(newVal.lines, function(val, i) {
							return colorMap.getNextColor();
						});
						
						// Calculate limits.
						var xmin = Number.MAX_VALUE;
						var xmax = -Number.MAX_VALUE;
						var ymin = Number.MAX_VALUE;
						var ymax = -Number.MAX_VALUE;
						for (var i = 0; i < newVal.lines.length; ++i) {
							var line = newVal.lines[i];
							if (line.isDiscrete) {
								// Assume for simplicity that the function is monotonic.
								// Check the first point in the data set.
								xmin = Math.min(xmin, line.data[0][0]);
								ymin = Math.min(ymin, line.data[0][1]);
								xmax = Math.max(xmax, line.data[0][0]);
								ymax = Math.max(ymax, line.data[0][1]);
								// Check the last point in the data set.
								var last = line.data.length - 1;
								xmin = Math.min(xmin, line.data[last][0]);
								ymin = Math.min(ymin, line.data[last][1]);
								xmax = Math.max(xmax, line.data[last][0]);
								ymax = Math.max(ymax, line.data[last][1]);
							} else {
								xmin = Math.min(xmin, line.limits.xmin);
								ymin = Math.min(ymin, line.limits.ymin);
								xmax = Math.max(xmax, line.limits.xmax);
								ymax = Math.max(ymax, line.limits.ymax);
							}
						}
						
						var argsMap = {
							containerId: id,
							data: {
								limits: {
									xmin: xmin,
									xmax: xmax,
									ymin: ymin,
									ymax: ymax
								},
								names: names,
								values: values,
								extraPoints: extraPoints,
								discrete: discrete,
								colors: colors,
								scale: scale,
								xAxisLabel: newVal.xAxisLabel,
								yAxisLabel: newVal.yAxisLabel
							}
						};
						LineGraph(argsMap);
					}
				},true);
				
				/**
				 * Create and draw a new line-graph.
				 * 
				 * Arguments:
				 *	 containerId => id of container to insert SVG into [REQUIRED]
				 *	 marginTop => Number of pixels for top margin. [OPTIONAL => Default: 20]
				 *	 marginRight => Number of pixels for right margin. [OPTIONAL => Default: 20]
				 *	 marginBottom => Number of pixels for bottom margin. [OPTIONAL => Default: 35]
				 *	 marginLeft => Number of pixels for left margin. [OPTIONAL => Default: 90]
				 *	 data => a dictionary containing the following keys [REQUIRED]
				 *		 values => The data array of arrays to graph. [REQUIRED]
				 *		 start => The start time in milliseconds since epoch of the data. [REQUIRED]
				 *		 end => The end time in milliseconds since epoch of the data. [REQUIRED]
				 *		 step => The time in milliseconds between each data value.	 [REQUIRED]	
				 *		 names => The metric name for each array of data. [REQUIRED]
				 *		 displayNames => Display name for each metric. [OPTIONAL => Default: same as 'names' argument]
				 *				Example: ['MetricA', 'MetricB'] 
				 *		 axis => Which axis (left/right) to put each metric on. [OPTIONAL => Default: Display all values on single axis]
				 *				Example: ['left', 'right', 'right'] to display first metric on left axis, next two on right axis.
				 *		 colors => What color to use for each metric. [OPTIONAL => Default: black]
				 *				Example: ['blue', 'red'] to display first metric in blue and second in red.
				 *		 scale => What scale to display the graph with. [OPTIONAL => Default: linear]
				 *				Possible Values: linear, pow, log
				 *		 rounding => How many decimal points to round each metric to. [OPTIONAL => Default: Numbers are rounded to whole numbers (0 decimals)]
				 *				Example: [2, 1] to display first metric with 2 decimals and second metric with 1. 
				 *		 numAxisLabelsPowerScale => Hint for how many labels should be displayed for the Y-axis in Power scale. [OPTIONAL => Default: 6]
				 *		 numAxisLabelsLinearScale  => Hint for how many labels should be displayed for the Y-axis in Linear scale. [OPTIONAL => Default: 6]
				 *
				 * Events (fired from container):
				 *	 LineGraph:dataModification => whenever data is changed
				 *	 LineGraph:configModification => whenever config is changed
				 */
				function LineGraph(argsMap) {
					/* *************************************************************** */
					/* public methods */
					/* *************************************************************** */
					var self = this;
					
					/* *************************************************************** */
					/* private variables */
					/* *************************************************************** */
					// the div we insert the graph into
					var containerId;
					var container;
					
					// functions we use to display and interact with the graphs and lines
					var graph, x, yLeft, yRight, xAxis, yAxisLeft, yAxisRight, yAxisLeftDomainStart, linesGroup, linesGroupDiscrete, extraPointsGroup, linesGroupText, lines, lineFunction, lineFunctionSeriesIndex = -1;
					
					var scales = [[SCALE_LINEAR,'Linear'], [SCALE_LOG,'Log']];
					// Default scales
					var yScale = SCALE_LOG; // can be pow, log, linear
					var xScale = SCALE_LOG; // can be pow, log, linear
					
					// Axis labels
					var xAxisLabel = '';
					var yAxisLabel = '';
					
					var hoverContainer, hoverLine, hoverLineXOffset, hoverLineYOffset, hoverLineGroup;
					var legendFontSize = 12; // we can resize dynamically to make fit so we remember it here
	
					// instance storage of data to be displayed
					var data;
						
					// define dimensions of graph
					var margin = [-1, -1, -1, -1]; // margins (top, right, bottom, left)
					var w, h;	 // width & height
					
					var transitionDuration = 300;
					
					var formatNumber = d3.format(",.1e");
					//var formatNumber = d3.format(",.3f") // for formatting integers
					var tickFormatForLogScale = function(d) { return formatNumber(d) };
					
					// used to track if the user is interacting via mouse/finger instead of trying to determine
					// by analyzing various element class names to see if they are visible or not
					var userCurrentlyInteracting = false;
					var currentUserPositionX = -1;
						
					/* *************************************************************** */
					/* initialization and validation */
					/* *************************************************************** */
					var _init = function() {
						// required variables that we'll throw an error on if we don't find
						containerId = getRequiredVar(argsMap, 'containerId');
						container = document.querySelector('#' + containerId);
						
						// margins with defaults (do this before processDataMap since it can modify the margins)
						margin[0] = getOptionalVar(argsMap, 'marginTop', 15) // marginTop allows fitting the actions, date and top of axis labels
						margin[1] = getOptionalVar(argsMap, 'marginRight', 20)
						margin[2] = getOptionalVar(argsMap, 'marginBottom', 35) // marginBottom allows fitting the legend along the bottom
						margin[3] = getOptionalVar(argsMap, 'marginLeft', 70) // marginLeft allows fitting the axis labels
						
						// assign instance vars from dataMap
						data = processDataMap(getRequiredVar(argsMap, 'data'));
						
						/* set the default scale */
						yScale = data.scale;
						xScale = data.scale;
						
						/* set the x and y axis labels */
						xAxisLabel = data.xAxisLabel;
						yAxisLabel = data.yAxisLabel;
	
						// do this after processing margins and executing processDataMap above
						initDimensions();
						
						createGraph()
						// debug("Initialization successful for container: " + containerId)	
						
						// window resize listener
						// de-dupe logic from http://stackoverflow.com/questions/667426/javascript-resize-event-firing-multiple-times-while-dragging-the-resize-handle/668185#668185
						var TO = false;
						$(window).resize(function(){
							if(TO !== false)
								clearTimeout(TO);
							TO = setTimeout(handleWindowResizeEvent, 200); // time in miliseconds
						});
					}
					
					/* *************************************************************** */
					/* private methods */
					/* *************************************************************** */
	
					/*
					 * Return a validated data map
					 * 
					 * Expects a map like this:
					 *	 {"start": 1335035400000, "end": 1335294600000, "step": 300000, "values": [[28,22,45,65,34], [45,23,23,45,65]]}
					 */
					var processDataMap = function(dataMap) {
						// assign data values to plot over time
						var dataValues = getRequiredVar(dataMap, 'values', "The data object must contain a 'values' value with a data array.")
						var extraPoints = getRequiredVar(dataMap, 'extraPoints', "The data object must contain an 'extraPoints' value with a data array.")
						//var startTime = new Date(getRequiredVar(dataMap, 'start', "The data object must contain a 'start' value with the start time in milliseconds since epoch."))
						//var endTime = new Date(getRequiredVar(dataMap, 'end', "The data object must contain an 'end' value with the end time in milliseconds since epoch."))
						//var step = getRequiredVar(dataMap, 'step', "The data object must contain a 'step' value with the time in milliseconds between each data value.")		
						var names = getRequiredVar(dataMap, 'names', "The data object must contain a 'names' array with the same length as 'values' with a name for each data value array.")	
						var discrete = getRequiredVar(dataMap, 'discrete', "The data object must contain a 'discrete' array with the same length as 'values' stating whether each array is a discrete line.")		
						var displayNames = getOptionalVar(dataMap, 'displayNames', names);
						var xAxisLabel = getOptionalVar(dataMap, 'xAxisLabel', '');
						var yAxisLabel = getOptionalVar(dataMap, 'yAxisLabel', '');
						var numAxisLabelsPowerScale = getOptionalVar(dataMap, 'numAxisLabelsPowerScale', 6); 
						var numAxisLabelsLinearScale = getOptionalVar(dataMap, 'numAxisLabelsLinearScale', 6); 
						
						var axis = getOptionalVar(dataMap, 'axis', []);
						// default axis values
						if(axis.length == 0) {
							displayNames.forEach(function (v, i) {
								// set the default to left axis
								axis[i] = "left";
							})
						} else {
							var hasRightAxis = false;
							axis.forEach(function(v) {
								if(v == 'right') {
									hasRightAxis = true;
								}
							})
							if(hasRightAxis) {
								// add space to right margin
								margin[1] = margin[1] + 50;
							}
						}
	
						
						var colors = getOptionalVar(dataMap, 'colors', []);
						// default colors values
						if(colors.length == 0) {
							displayNames.forEach(function (v, i) {
								// set the default
								colors[i] = "black";
							})
						}
						
						// var maxValues = [];
						// var rounding = getOptionalVar(dataMap, 'rounding', []);
						// default rounding values
						// if(rounding.length == 0) {
							// displayNames.forEach(function (v, i) {
								// set the default to 0 decimals
								// rounding[i] = 0;
							// })
						// }
						
						/* copy the dataValues array, do NOT assign the reference otherwise we modify the original source when we shift/push data */
						//var newDataValues = [];
						//dataValues.forEach(function (v, i) {
						//	newDataValues[i] = v.slice(0);
						//	maxValues[i] = d3.max(newDataValues[i])
						//})
	
						return {
							//"values" : newDataValues,
							"values" : dataValues,
							"extraPoints": extraPoints,
							//"startTime" : startTime,
							//"endTime" : endTime,
							//"step" : step,
							"names" : names,
							"discrete": discrete,
							"displayNames": displayNames,
							"axis" : axis,
							"colors": colors,
							"scale" : getOptionalVar(dataMap, 'scale', yScale),
							"xAxisLabel": xAxisLabel,
							"yAxisLabel": yAxisLabel,
							//"maxValues" : maxValues,
							//"rounding" : rounding,
							"numAxisLabelsLinearScale": numAxisLabelsLinearScale,
							"numAxisLabelsPowerScale": numAxisLabelsPowerScale
						}
					}
					
					var redrawAxes = function(withTransition) {
						initY();
						initX();
						
						if(withTransition) {
							// slide x-axis to updated location
							graph.selectAll("g .x.axis").transition()
							.duration(transitionDuration)
							.ease("linear")
							.call(xAxis)				  
						
							// slide y-axis to updated location
							graph.selectAll("g .y.axis.left").transition()
							.duration(transitionDuration)
							.ease("linear")
							.call(yAxisLeft)
							
							if(yAxisRight != undefined) {
								// slide y-axis to updated location
								graph.selectAll("g .y.axis.right").transition()
								.duration(transitionDuration)
								.ease("linear")
								.call(yAxisRight)
							}
						} else {
							// slide x-axis to updated location
							graph.selectAll("g .x.axis")
							.call(xAxis)				  
						
							// slide y-axis to updated location
							graph.selectAll("g .y.axis.left")
							.call(yAxisLeft)
	
							if(yAxisRight != undefined) {			
								// slide y-axis to updated location
								graph.selectAll("g .y.axis.right")
								.call(yAxisRight)
							}
						}
					}
					
					var redrawLines = function(withTransition) {
						/**
						* This is a hack to deal with the left/right axis.
						* See createGraph for a larger comment explaining this. 
						* Yes, it's ugly. If you can suggest a better solution please do.
						*/
						lineFunctionSeriesIndex  =-1;
						
						// redraw lines
						if(withTransition) {
							graph.selectAll("g .lines path")
							.transition()
								.duration(transitionDuration)
								.ease("linear")
								.attr("d", lineFunction)
								.attr("transform", null);
								
							graph.selectAll("g .lines .dot")
								.transition()
									.duration(transitionDuration)
									.ease("linear")
									.attr("cx", function(d) {
										return x(d[0]);
									})
									.attr("cy", function(d) {
										return yLeft(d[1]);
									})
									.attr("transform", null);
						} else {
							graph.selectAll("g .lines path")
								.attr("d", lineFunction)
								.attr("transform", null);
								
							lineFunctionSeriesIndex = -1;
							graph.selectAll("g .lines .dot")
								.attr("cx", function(d) {
									return x(d[0]);
								})
								.attr("cy", function(d) {
									return yLeft(d[1]);
								})
								.attr("transform", null);
						}
					}
					
					/*
					 * Allow re-initializing the y function at any time.
					 *  - it will properly determine what scale is being used based on last user choice (via public switchScale methods)
					 */
					var initY = function() {
						initYleft();
						initYright();
					}
					
					var initYleft = function() {
						var maxYscaleLeft = calculateMaxY(data, 'left')
						// debug("initY => maxYscale: " + maxYscaleLeft);
						var numAxisLabels = 4;
						if(yScale == SCALE_POWER) {
							yLeft = d3.scale.pow().exponent(0.3).domain([0, maxYscaleLeft]).range([h, 0]).nice();	
							numAxisLabels = data.numAxisLabelsPowerScale;
						} else if(yScale == SCALE_LOG) {
							// we can't have 0 so will represent 0 with a very small number
							// 0.1 works to represent 0, 0.01 breaks the tickFormatter
							yLeft = d3.scale.log().domain([calculateMinY(), maxYscaleLeft]).range([h, 0]).nice();	
						} else if(yScale == SCALE_LINEAR) {
							yLeft = d3.scale.linear().domain([0, maxYscaleLeft]).range([h, 0]).nice();
							numAxisLabels = data.numAxisLabelsLinearScale;
						}
	
						yAxisLeft = d3.svg.axis().scale(yLeft).ticks(numAxisLabels, tickFormatForLogScale).orient("left").tickSize(-w,0,0);
					}
					
					var initYright = function() {
						var maxYscaleRight = calculateMaxY(data, 'right')
						// only create the right axis if it has values
						if(maxYscaleRight != undefined) {
							// debug("initY => maxYscale: " + maxYscaleRight);
							var numAxisLabels = 6;
							if(yScale == SCALE_POWER) {
								yRight = d3.scale.pow().exponent(0.3).domain([0, maxYscaleRight]).range([h, 0]).nice();		
								numAxisLabels = data.numAxisLabelsPowerScale;
							} else if(yScale == SCALE_LOG) {
								// we can't have 0 so will represent 0 with a very small number
								// 0.1 works to represent 0, 0.01 breaks the tickFormatter
								yRight = d3.scale.log().domain([0.1, maxYscaleRight]).range([h, 0]).nice();	
							} else if(yScale == SCALE_LINEAR) {
								yRight = d3.scale.linear().domain([0, maxYscaleRight]).range([h, 0]).nice();
								numAxisLabels = data.numAxisLabelsLinearScale;
							}
							
							yAxisRight = d3.svg.axis().scale(yRight).ticks(numAxisLabels, tickFormatForLogScale).orient("right");
						}
					}
									
					/**
					 * Allow re-initializing the x function at any time.
					 */
					var initX = function() {
						//x = d3.scale.log().range([0, w]);
						//x.domain([calculateMinX(), calculateMaxX()])
						// create yAxis (with ticks)
						//xAxis = d3.svg.axis().scale(x).tickSize(-h,0,0).tickSubdivide(0);
						
						var numAxisLabels = 5; //TODO:this needs to be re-usable
						if(xScale == SCALE_POWER) {
							x = d3.scale.pow().exponent(0.3).domain([calculateMinX(), calculateMaxX()]).range([0, w]).nice();	
							numAxisLabels = data.numAxisLabelsPowerScale;
						} else if(xScale == SCALE_LOG) {
							x = d3.scale.log().domain([calculateMinX(), calculateMaxX()]).range([0, w]).nice();	
						} else if(xScale == SCALE_LINEAR) {
							x = d3.scale.linear().domain([calculateMinX(), calculateMaxX()]).range([0, w]).nice();
							numAxisLabels = data.numAxisLabelsLinearScale;
						}
						xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(numAxisLabels, tickFormatForLogScale).tickSize(-h,0,0).tickSubdivide(0);
					}
	
					/*
					 * Whenever we add/update data we want to re-calculate if scales have changed
					 */
					var calculateMinX = function(data, whichAxis) {
						return argsMap.data.limits.xmin;
					}				
					var calculateMaxX = function(data, whichAxis) {
						return argsMap.data.limits.xmax;
					}
					var calculateMinY = function(data, whichAxis) {
						return argsMap.data.limits.ymin;
					}
					var calculateMaxY = function(data, whichAxis) {
						return argsMap.data.limits.ymax;
					}
					
					/**
					* Creates the SVG elements and displays the line graph.
					*
					* Expects to be called once during instance initialization.
					*/
					var createGraph = function() {
						
						// Add an SVG element with the desired dimensions and margin.
						graph = d3.select("#" + containerId).append("svg:svg")
								.attr("class", "line-graph")
								.attr("width", w + margin[1] + margin[3])
								.attr("height", h + margin[0] + margin[2])	
								.append("svg:g")
									.attr("transform", "translate(" + margin[3] + "," + margin[0] + ")");
	
						initX();		
						
						// Add the x-axis.
						graph.append("svg:g")
							.attr("class", "x axis")
							.attr("transform", "translate(0," + h + ")")
							.call(xAxis);
							
						
						// y is all done in initY because we need to re-assign vars quite often to change scales
						initY();
								
						// Add the y-axis to the left
						graph.append("svg:g")
							.attr("class", "y axis left")
							.attr("transform", "translate(0,0)")
							.call(yAxisLeft);
							
						if(yAxisRight != undefined) {
							// Add the y-axis to the right if we need one
							graph.append("svg:g")
								.attr("class", "y axis right")
								.attr("transform", "translate(" + (w+10) + ",0)")
								.call(yAxisRight);
						}
						
						//data.values.forEach( function(v,k) { 
						
						// create line function used to plot our data
						lineFunction = d3.svg.line()
							.x(function(d,i) { 
								var _x = x(d[0]); 
								// debug("Line X => index: " + d + " scale: " + _x)
								return _x;
								})
							.y(function(d, i) { 
								//if(yScale == 'log' && d < 0.1) {
								//	// log scale can't have 0s, so we set it to the smallest value we set on y
								//	d = 0.1;
								//}
								if(i == 0) {
									lineFunctionSeriesIndex++;
								}
								var axis = data.axis[lineFunctionSeriesIndex];
								var _y;
								if(axis == 'right') {
									_y = yRight(d[1]); 
								} else {
									_y = yLeft(d[1]); 
								}
	
								// verbose logging to show what's actually being done
								// debug("Line Y => data: " + d + " scale: " + _y)
								// return the Y coordinate where we want to plot this datapoint
								return _y;
							});
							// .defined(function(d) {
								// handle missing data gracefully
								// feature added in https://github.com/mbostock/d3/pull/594
								// return d >= 0;
							// });
							
							
						// add a group of points to display extra point data
						var extraPoints = graph.append("svg:g")
							.attr("class", "lines")
							.selectAll(".dot")
							.data(data.extraPoints) // bind the array of arrays
							
						extraPointsGroup = extraPoints.enter().append("g")
							.filter(function(d, i) {
								return !!data.extraPoints[i];
							})
							.attr("class", function(d, i) {
								return "line_group series_" + i;
							});
						
						// add the extra data points
						lineFunctionSeriesIndex = -1;
						extraPointsGroup.selectAll(".dot")
							.data(function(d, i) {
								return d;
							})
							.enter().append("svg:circle")
							.attr("class", "dot")
							.attr("r", 3.5)
							.attr("cx", function(d) {
								return x(d[0]);
							})
							.attr("cy", function(d) {
								return yLeft(d[1]);
							})
							.attr("fill", "transparent")
							.attr("stroke", function(d, i) {
								if (i == 0) {
									lineFunctionSeriesIndex++;
								}
								return "gray";//data.colors[lineFunctionSeriesIndex];
							});
	
						// append a group to contain all lines
						lines = graph.append("svg:g")
							.attr("class", "lines")
							.selectAll("path")
							.data(data.values); // bind the array of arrays
	
						// persist this reference so we don't do the selector every mouse event
						hoverContainer = container.querySelector('g .lines');
						
						$(container).mouseleave(function(event) {
							handleMouseOutGraph(event);
						})
						
						$(container).mousemove(function(event) {
							handleMouseOverGraph(event);
						})		
	
									
						// add a line group for each array of values (it will iterate the array of arrays bound to the data function above)
						linesGroup = lines.enter().append("g")
								.attr("class", function(d, i) {
									return "line_group series_" + i;
								});
								
						// add path (the actual line) to line group
						linesGroup.append("path")
								.attr("class", function(d, i) {
									// debug("Appending line [" + containerId + "]: " + i)
									return "line series_" + i;
								})
								.attr("fill", "none")
								.attr("stroke", function(d, i) {
									return data.colors[i];
								})
								//.attr("stroke", data.colors[k])
								.attr("d", lineFunction) // use the 'lineFunction' to create the data points in the correct x,y axis
								
								.on('mouseover', function(d, i) {
									handleMouseOverLine(d, i);
								});
						
						// add a group of points for discrete line groups
						linesGroupDiscrete = lines.enter().append("g")
							.filter(function(d, i) {
								return data.discrete[i];
							})
							.attr("class", function(d, i) {
								return "line_group series_" + i;
							});
						
						// add data points to the line group (if dataset is discrete)
						lineFunctionSeriesIndex = -1;
						linesGroupDiscrete.selectAll(".dot")
							.data(function(d, i) {
								return d;
							})
							.enter().append("svg:circle")
							.attr("class", "dot")
							.attr("r", 3.5)
							.attr("cx", function(d) {
								return x(d[0]);
							})
							.attr("cy", function(d) {
								return yLeft(d[1]);
							})
							.attr("fill", "transparent")
							.attr("stroke", function(d, i) {
								if (i == 0) {
									lineFunctionSeriesIndex++;
								}
								return data.colors[lineFunctionSeriesIndex];
							});
						
						
								
						// add line label to line group
						linesGroupText = linesGroup.append("svg:text");
						linesGroupText.attr("class", function(d, i) {
								// debug("Appending line [" + containerId + "]: " + i)
								return "line_label series_" + i;
							})
							.text(function(d, i) {
									return "";
								});
						
						//});		//end of foreach in data
						
						// add a 'hover' line that we'll show as a user moves their mouse (or finger)
						// so we can use it to show detailed values of each line
						hoverLineGroup = graph.append("svg:g")
											.attr("class", "hover-line");
						// add the line to the group
						hoverLine = hoverLineGroup
							.append("svg:line")
								.attr("x1", 0).attr("x2", 0) // vertical line so same value on each
								.attr("y1", 0).attr("y2", h) // top to bottom	
								.attr("stroke","#6E7B8B")
								.attr("fill","none");
						// hide it by default
						hoverLine.classed("hide", true);
						
						createXScaleButtons();
						createScaleButtons();
						createDateLabel();
						createLegend();
						createXAxisLabel();
						createYAxisLabel();
						setValueLabelsToLatest();
						//createPropertiesButtons();
					}
					
					var createXAxisLabel = function() {
						var xAxisTitle = graph.append("svg:text")
							.text(xAxisLabel)
							.attr("style", "text-anchor:middle")
							.attr("font-weight", "bold")
							.attr("x", w/2)
							.attr("y", h+30);
					};
					
					var createYAxisLabel = function() {
						var yAxisTitle = graph.append("svg:text")
							.text(yAxisLabel)
							.attr("style", "text-anchor:middle")
							.attr("transform", "rotate(270)")
							.attr("font-weight", "bold")
							.attr("x", -h/2)
							.attr("y", -45);
					};
					
					/**
					 * Create a legend that displays the name of each line with appropriate color coding
					 * and allows for showing the current value when doing a mouseOver
					 */
					var createLegend = function() {
						
						// append a group to contain all lines
						var legendLabelGroup = graph.append("svg:g")
								.attr("class", "legend-group")
							.selectAll("g")
								.data(data.displayNames)
							.enter().append("g")
								.attr("class", "legend-labels");
								
						legendLabelGroup.append("svg:text")
								.attr("class", "legend name")
								.text(function(d, i) {
									return d;
								})
								.attr("font-size", legendFontSize)
								.attr("style", "text-anchor:end")
								.attr("fill", function(d, i) {
									// return the color for this row
									return data.colors[i];
								})
								.attr("y", function(d, i) {
									//return h+28+;
									return 20+i*20;
								})
	
								
						// put in placeholders with 0 width that we'll populate and resize dynamically
						legendLabelGroup.append("svg:text")
								.attr("class", "legend value")
								.attr("font-size", legendFontSize)
								.attr("fill", function(d, i) {
									return data.colors[i];
								})
								.attr("y", function(d, i) {
									//return h+28;
									return 20+i*20;
								})		
						
	
						var cumulativeWidth = 0;
						var labelNameEnd = [];
						graph.selectAll("text.legend.name")
								.attr("x", function(d, i) {
									return $("#" + containerId).width()-240;		//return returnX;
								})
						
						// x values are not defined here since those get dynamically calculated when data is set in displayValueLabelsForPositionX()
					}
					
					/**
					 * Create scale buttons for switching the x-axis
					 */
					var createXScaleButtons = function() {
						var cumulativeWidth = $("#" + containerId).width()-260;		
						var label = graph.append("svg:text")
							.attr("font-size", "12")
							.attr("font-weight", "bold")
							.text("X-axis Scale:")
							.attr("y", h+25)
							.attr("x", function(d, i) {
								// return it at the width of previous labels (where the last one ends)
								var returnX = cumulativeWidth;
								// increment cumulative to include this one
								cumulativeWidth += this.getComputedTextLength()+5;
								return returnX;
							});
						// append a group to contain all lines
						var buttonGroup = graph.append("svg:g")
							.attr("class", "x-scale-button-group")
							.selectAll("g")
							.data(scales)
							.enter()
							.append("svg:text")
								.attr("class", "x-scale-button")
								.text(function(d, i) {
									return d[1];
								})
								.attr("font-size", "12") // this must be before "x" which dynamically determines width
								.attr("fill", function(d) {
									if(d[0] == xScale) {
										return "black";
									} else {
										return "blue";
									}
								})
								.classed("selected", function(d) {
									if(d[0] == xScale) {
										return true;
									} else {
										return false;
									}
								})
								.attr("x", function(d, i) {
									// return it at the width of previous labels (where the last one ends)
									var returnX = cumulativeWidth;
									// increment cumulative to include this one
									cumulativeWidth += this.getComputedTextLength()+5;
									return returnX;
								})
								.attr("y", h+25)
								.on('click', function(d, i) {
									handleMouseClickXScaleButton(this, d, i);
								});
					}
	
					var handleMouseClickXScaleButton = function(button, buttonData, index) {
						xScale = buttonData[0];
						redrawAxes(true);
						redrawLines(true);
						
						// change text decoration
						graph.selectAll('.x-scale-button')
						.attr("fill", function(d) {
							if(d[0] == xScale) {
								return "black";
							} else {
								return "blue";
							}
						})
						.classed("selected", function(d) {
							if(d[0] == xScale) {
								return true;
							} else {
								return false;
							}
						})
						
					}
					
					
					
					/**
					 * Create scale buttons for switching the y-axis
					 */
					var createScaleButtons = function() {
						var cumulativeWidth = 0;
						var label = graph.append("svg:text")
							.attr("font-size", "12")
							.attr("font-weight", "bold")
							.text("Y-axis Scale:")
							.attr("y", -4)
							.attr("x", function(d, i) {
									// return it at the width of previous labels (where the last one ends)
									var returnX = cumulativeWidth;
									// increment cumulative to include this one
									cumulativeWidth += this.getComputedTextLength()+5;
									return returnX;
								});
						// append a group to contain all lines
						var buttonGroup = graph.append("svg:g")
							.attr("class", "scale-button-group")
							.selectAll("g")
							.data(scales)
							.enter()
							.append("svg:text")
								.attr("class", "scale-button")
								.text(function(d, i) {
									return d[1];
								})
								.attr("font-size", "12") // this must be before "x" which dynamically determines width
								.attr("fill", function(d) {
									if(d[0] == yScale) {
										return "black";
									} else {
										return "blue";
									}
								})
								.classed("selected", function(d) {
									if(d[0] == yScale) {
										return true;
									} else {
										return false;
									}
								})
								.attr("x", function(d, i) {
									// return it at the width of previous labels (where the last one ends)
									var returnX = cumulativeWidth;
									// increment cumulative to include this one
									cumulativeWidth += this.getComputedTextLength()+5;
									return returnX;
								})
								.attr("y", -4)
								.on('click', function(d, i) {
									handleMouseClickScaleButton(this, d, i);
								});
					}
	
					var handleMouseClickScaleButton = function(button, buttonData, index) {
						yScale = buttonData[0];
						redrawAxes(true);
						redrawLines(true);
						
						// change text decoration
						graph.selectAll('.scale-button')
						.attr("fill", function(d) {
							if(d[0] == yScale) {
								return "black";
							} else {
								return "blue";
							}
						})
						.classed("selected", function(d) {
							if(d[0] == yScale) {
								return true;
							} else {
								return false;
							}
						})
						
					}
					
					/**
					 * Create a data label
					 */
					var createDateLabel = function() {
						var date = new Date(); // placeholder just so we can calculate a valid width
						// create the date label to the left of the scaleButtons group
						var buttonGroup = graph.append("svg:g")
								.attr("class", "date-label-group")
							.append("svg:text")
								.attr("class", "date-label")
								.attr("text-anchor", "end") // set at end so we can position at far right edge and add text from right to left
								.attr("font-size", "10") 
								.attr("y", -4)
								.attr("x", w)
								.text(date.toDateString() + " " + date.toLocaleTimeString())
								
					}
	
					/*var createPropertiesButtons = function() {
						var cumulativeWidthProperties = 0;		
						// append a group to contain all lines
						var buttonGroup = graph.append("svg:g")
								.attr("class", "properties-button-group")
							.append("g")
								.attr("class", "properties-buttons")
							.append("svg:text")
								.attr("class", "properties-button")
								.text("Graph Settings")
								.attr("font-size", "12") // this must be before "x" which dynamically determines width
								.attr("x", w-300)
								.attr("y", -4)
								.on('click', function(d, i) {
								
	
									alert("here soon...");
									// argsMap.data.limits.xmin = 1;
									// argsMap.data.limits.xmax = 100;
									// initY();
									// initX();
									// redrawAxes(true);
									// redrawLines(true);
								});
					}*/
					
					
					
					/**
					 * Called when a user mouses over a line.
					 */
					var handleMouseOverLine = function(lineData, index) {
						// debug("MouseOver line [" + containerId + "] => " + index)
						
						// user is interacting
						userCurrentlyInteracting = true;
					}
	
					/**
					 * Called when a user mouses over the graph.
					 */
					var handleMouseOverGraph = function(event) {	
						var mouseX = event.pageX-hoverLineXOffset;
						var mouseY = event.pageY-hoverLineYOffset;
						
						// debug("MouseOver graph [" + containerId + "] => x: " + mouseX + " y: " + mouseY + "  height: " + h + " event.clientY: " + event.clientY + " offsetY: " + event.offsetY + " pageY: " + event.pageY + " hoverLineYOffset: " + hoverLineYOffset)
						if(mouseX >= 0 && mouseX <= w && mouseY >= 0 && mouseY <= h) {
							//show the hover line
							hoverLine.classed("hide", false);
	
							//set position of hoverLine
							hoverLine.attr("x1", mouseX).attr("x2", mouseX)
							
							displayValueLabelsForPositionX(mouseX)
							
							//user is interacting
							userCurrentlyInteracting = true;
							currentUserPositionX = mouseX;
						} else {
							//proactively act as if we've left the area since we're out of the bounds we want
							handleMouseOutGraph(event)
						}
					}
					
					
					var handleMouseOutGraph = function(event) {	
						//hide the hover-line
						hoverLine.classed("hide", true);
						
						setValueLabelsToLatest();
						
						//// debug("MouseOut graph [" + containerId + "] => " + mouseX + ", " + mouseY)
						
						//user is no longer interacting
						userCurrentlyInteracting = false;
						currentUserPositionX = -1;
					}
					
					/*
					* Handler for when data is updated.
					*/
					var handleDataUpdate = function() {
						if(userCurrentlyInteracting) {
							// user is interacting, so let's update values to wherever the mouse/finger is on the updated data
							if(currentUserPositionX > -1) {
								displayValueLabelsForPositionX(currentUserPositionX)
							}
						} else {
							// the user is not interacting with the graph, so we'll update the labels to the latest
							setValueLabelsToLatest();
						}
					}
					
					/**
					* Display the data values at position X in the legend value labels.
					*/
					var displayValueLabelsForPositionX = function(xPosition, withTransition) {
						var animate = false;
						if(withTransition != undefined) {
							if(withTransition) {
								animate = true;
							}
						}
						var dateToShow;
						var labelValueWidths = [];
						graph.selectAll("text.legend.value")
						.text(function(d, i) {
							var valuesForX = getValueForPositionXFromData(xPosition, i);
							dateToShow = valuesForX.date;
							return valuesForX.value;
						})
						.attr("x", function(d, i) {
							labelValueWidths[i] = this.getComputedTextLength(); 
						})
	
						// position label names
						var cumulativeWidth = 0;
						var labelNameEnd = [];

						// remove last bit of padding from cumulativeWidth
						cumulativeWidth = cumulativeWidth - 8;
	
						if(cumulativeWidth > w) {
							// decrease font-size to make fit
							legendFontSize = legendFontSize-1;
							// debug("making legend fit by decreasing font size to: " + legendFontSize)
							graph.selectAll("text.legend.name")
								.attr("font-size", legendFontSize);
							graph.selectAll("text.legend.value")
								.attr("font-size", legendFontSize);
							
							// recursively call until we get ourselves fitting
							displayValueLabelsForPositionX(xPosition);
							return;
						}
	
						// position label values
						graph.selectAll("text.legend.value")
						.attr("x", function(d, i) {
							//return labelNameEnd[i];
							return $("#" + containerId).width()-230;	
						})
						
	
						// show the date
						//graph.select('text.date-label').text(dateToShow.toDateString() + " " + dateToShow.toLocaleTimeString())
					}
					
					/**
					* Set the value labels to whatever the latest data point is.
					*/
					var setValueLabelsToLatest = function(withTransition) {
						displayValueLabelsForPositionX(w, withTransition);
					}
					
					/**
					* Convert back from an X position on the graph to a data value from the given array (one of the lines)
					* Return {value: value, date, date}
					*/
					var getValueForPositionXFromData = function(xPosition, dataSeriesIndex) {
						var d = data.values[dataSeriesIndex]
						var xValue = x.invert(xPosition);
						var index = (xValue - 1) / data.step;
						var dlength = _.size(d);
						
						if (xValue >= d[0][0] && xValue <= d[dlength-1][0]) {
							for (var m = 1; m < dlength; m++) {
								if (xValue < d[m][0]) {
									var temp = ((xValue - d[m-1][0])*(d[m][1] - d[m-1][1])/(d[m][0]-d[m-1][0])+d[m-1][1]);
									return {value: '('+xValue.toFixed(4)+','+temp.toFixed(4)+')', date: null};
								}
							}
						}
						return {value: "", date: null};
					}
	
					
					/**
					 * Called when the window is resized to redraw graph accordingly.
					 */
					var handleWindowResizeEvent = function() {
						initDimensions();
					}
	
					/**
					 * Set height/width dimensions based on container.
					 */
					var initDimensions = function() {
						//w = $("#" + containerId).width() - margin[1] - margin[3]; // width
						//h = $("#" + containerId).height() - margin[0] - margin[2]; // height
						//hoverLineXOffset = margin[3]+$(container).offset().left;
						//hoverLineYOffset = margin[0]+$(container).offset().top;
						w = parseInt(width) - margin[1] - margin[3]; // width
						h = parseInt(height) - margin[0] - margin[2]; // height
						hoverLineXOffset = margin[3]+$(container).offset().left;
						hoverLineYOffset = margin[0]+$(container).offset().top;
					}
					
					/**
					* Return the value from argsMap for key or throw error if no value found
					*/	  
					var getRequiredVar = function(argsMap, key, message) {
						if(!argsMap[key]) {
							if(!message) {
								throw new Error(key + " is required")
							} else {
								throw new Error(message)
							}
						} else {
							return argsMap[key]
						}
					}
					
					/**
					* Return the value from argsMap for key or defaultValue if no value found
					*/
					var getOptionalVar = function(argsMap, key, defaultValue) {
						if(!argsMap[key]) {
							return defaultValue
						} else {
							return argsMap[key]
						}
					}
					
					var error = function(message) {
						console.log("ERROR: " + message)
					}
	
					var debug = function(message) {
						console.log("// debug: " + message)
					}
					
					/* round a number to X digits: num => the number to round, dec => the number of decimals */
					/* private */ function roundNumber(num, dec) {
						var result = Math.round(num*Math.pow(10,dec))/Math.pow(10,dec);
						var resultAsString = result.toString();
						if(dec > 0) {
							if(resultAsString.indexOf('.') == -1) {
								resultAsString = resultAsString + '.';
							}
							// make sure we have a decimal and pad with 0s to match the number we were asked for
							var indexOfDecimal = resultAsString.indexOf('.');
							while(resultAsString.length <= (indexOfDecimal+dec)) {
								resultAsString = resultAsString + '0';
							}
						}
						return resultAsString;
					};
					
					_init();
				};			
				
				
				
				
			};
		}
	};
}]);