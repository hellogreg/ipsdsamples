(function () {
  "use strict";

  // External namespaces used: d3 (D3.js), d3_queue (for queueing Ajax calls), ss (Simple Statistics).

  // To remove svg content: d3.select("#chart").select(*).remove();

  var inDebugMode = true; // toggle log()/dir() with this.

  var window = this || (0 || eval)("this");

  // Expose the IpsdData function to our webpage. (Couldn't call it 204data, because of var naming conventions!)
  window.IpsdData = IpsdData;

  // We're not using jQuery, but the $ format is familiar for our chart DOM elements.
  var $chart = d3.select("#chart");

  // Will charts start at zero instead of auto-scaling?
  var scaleFromZero = document.getElementById("data-zero").checked || false;

  // clearChart() gets rid of all existing child content under $chart when a new chart is to be drawn.
  function clearChart() {
    $chart.selectAll("*").remove();
  }

  function createSvgCanvas(canvas, margin) {
    var c = canvas || { width: 800, height: 540 };
    var m = margin || { top: 0, right: 0, bottom: 0, left: 0 };
    return $chart
      .append("svg")
      .attr("width", c.width)
      .attr("height", c.height)
      .append("g")
      .attr("transform", "translate(" + m.left + ", " + m.top + ")");
  }

  // Local log() and dir() functions that give accurate line numbers and are only enabled when inDebugMode === true.
  var console = window.console || null;
  var dir, log;
  if (inDebugMode && console) {
    console.clear();
    log = console.log.bind(window.console);
    dir = console.dir.bind(window.console);
  } else {
    log = function () {
      return undefined;
    };
    dir = function () {
      return undefined;
    };
  }

  // Quick object copier.
  function copyObject(o) {
    return JSON.parse(JSON.stringify(o));
  }

  //
  // Lineplot() object, which contains any functions for drawing lines with plotted points.
  //

  function Lineplot() {
    clearChart();
    var isInitialDraw = true;
    var transitionDuration = 1000;

    var canvas = { width: 800, height: 300 };
    var margin = { top: 100, right: 50, bottom: 20, left: 50 };
    var width = canvas.width - margin.left - margin.right;
    var height = canvas.height - margin.top - margin.bottom;

    var svg = createSvgCanvas(canvas, margin);

    var lpRange = d3.scale.linear().range([0, width]);

    return {
      drawChart: function (districts, categories, firstCategoryId) {
        var data = districts.data;
        var minVal, maxVal;

        // Omitting State Average, for now. Comment out if we want it restored.
        var stateAverage = districts.getStateAverage();
        var showStateAverageInfo = true; //(stateAverage && (!!stateAverage[firstCategoryId]) && (!!stateAverage[secondCategoryId]));

        var lpCategory = categories.getByKey(firstCategoryId);
        var lpFormat = d3.format(lpCategory.d3format);

        minVal = d3.min(data, function (d) {
          if (scaleFromZero) {
            return 0;
          } else {
            return d[firstCategoryId] * 0.98;
          }
        });

        maxVal = d3.max(data, function (d) {
          return d[firstCategoryId] * 1.02;
        });

        lpRange.domain([minVal, maxVal]);

        var axes = svg.append("g").attr("id", "axes");

        var linepoints = svg
          .selectAll("linepoints")
          .data(data)
          .enter()
          .append("g")
          .attr("class", "district lineplot");

        var lpAxis = d3.svg
          .axis()
          .scale(lpRange)
          .orient("top")
          .ticks(0)
          .tickValues([minVal, maxVal])
          .tickFormat(function (d) {
            if (d >= 2000) {
              d = Math.round(d / 1000) * 1000;
            } else if (d >= 10) {
              d = Math.round(d);
            }
            return lpFormat(d);
          });
        //.tickFormat(d3.format(lpFormat));

        // Create SVG assets if this is the first time the function is executed.
        if (isInitialDraw) {
          isInitialDraw = false;

          // Axes and category headers

          axes.append("g").attr("class", "l lineplot axis").attr("transform", "translate(0, 0)");

          axes
            .append("text")
            .attr("class", "lineplot legend lp")
            .attr("text-anchor", "left")
            .attr("transform", "translate(" + -30 + "," + -65 + ")");

          // Draw lines before points, to go behind them.
          linepoints
            .append("line")
            .attr("class", function (d) {
              if (d.isFeatured) {
                return "line featuredline";
              } else if (d.isStateAverage && showStateAverageInfo) {
                return "line stateline";
              } else if (d.isStateAverage && !showStateAverageInfo) {
                return "line hide";
              }
              return "line districtline";
            })
            .attr("stroke-width", 1);

          // Points
          linepoints
            .append("circle")
            .attr("class", function (d) {
              if (d.isFeatured) {
                return "point lp featuredfill";
              } else if (d.isStateAverage && showStateAverageInfo) {
                return "point lp statefill";
              } else if (d.isStateAverage && !showStateAverageInfo) {
                return "point lp hide";
              }
              return "point lp";
            })
            .attr("r", "6");

          linepoints
            .append("text")
            .attr("class", function (d) {
              if (d.isFeatured) {
                return "districttext lp featuredfill";
              } else if (d.isStateAverage && showStateAverageInfo) {
                return "districttext lp statefill";
              } else if (d.isStateAverage && !showStateAverageInfo) {
                return "districttext lp hide";
              }
              return "districttext lp";
            })
            .attr("text-anchor", "end");
        }

        // Axes and category headers

        svg.selectAll(".l").call(lpAxis);

        svg.selectAll(".legend.lp").text(lpCategory.label);

        // Select SVG elements and draw (or transition) based on the data.

        var yOffset = 15;
        var lineCounter = 1;
        svg
          .selectAll(".lineplot .line")
          .data(data)
          .transition()
          .duration(transitionDuration)
          .attr("y1", 6)
          .attr("x1", function (d) {
            return lpRange(d[firstCategoryId]);
          })
          .attr("y2", function (d) {
            if (d.isFeatured) {
              return -27;
            } else if (d.isStateAverage) {
              return 34;
            }
            //log("lineCounter: " + lineCounter);
            lineCounter++;
            return 19 + yOffset * lineCounter;
          })
          .attr("x2", function (d) {
            return lpRange(d[firstCategoryId]);
          });

        svg
          .selectAll(".lineplot circle.point.lp")
          .data(data)
          .transition()
          .duration(transitionDuration)
          .attr("cy", 0)
          .attr("cx", function (d) {
            return lpRange(d[firstCategoryId]);
          });

        var textCounter = 1;
        svg
          .selectAll(".lineplot .districttext.lp")
          .data(data)
          .transition()
          .duration(transitionDuration)
          .attr("y", function (d) {
            if (d.isFeatured) {
              return -32;
            } else if (d.isStateAverage) {
              return 45;
            }
            //log("textCounter: " + textCounter);
            textCounter++;
            return 30 + yOffset * textCounter;
          })
          .attr("x", function (d) {
            return lpRange(d[firstCategoryId]);
          })
          .text(function (d) {
            if (d.isFeatured) {
              return d.district + " [" + lpFormat(d[firstCategoryId]).trim() + "]";
            } else {
              return d.district;
            }
          });
      },
    };
  }
  // END Lineplot().

  //
  // Slopegraph() object, which contains any functions for drawing slopes.
  //

  function Slopegraph() {
    clearChart();
    var isInitialDraw = true;
    var transitionDuration = 1000;

    var canvas = { width: 500, height: 480 };
    var margin = { top: 50, right: 0, bottom: 20, left: 0 };
    var width = canvas.width - margin.left - margin.right;
    var height = canvas.height - margin.top - margin.bottom;

    var svg = createSvgCanvas(canvas, margin);

    var leftY = d3.scale.linear().range([height, 0]);
    var rightY = d3.scale.linear().range([height, 0]);

    return {
      drawChart: function (districts, categories, firstCategoryId, secondCategoryId) {
        var data = districts.data;
        var minLeft, maxLeft, minRight, maxRight;

        // Omitting State Average, for now.
        var stateAverage = districts.getStateAverage();
        var showStateAverageInfo = false; //(stateAverage && (!!stateAverage[firstCategoryId]) && (!!stateAverage[secondCategoryId]));

        var leftCategory = categories.getByKey(firstCategoryId);
        var rightCategory = categories.getByKey(secondCategoryId);
        var leftFormat = d3.format(leftCategory.d3format);
        var rightFormat = d3.format(rightCategory.d3format);

        minLeft = d3.min(data, function (d) {
          return d[firstCategoryId] * 0.9;
        });

        maxLeft = d3.max(data, function (d) {
          return d[firstCategoryId] * 1.1;
        });

        minRight = d3.min(data, function (d) {
          return d[secondCategoryId] * 0.9;
        });

        maxRight = d3.max(data, function (d) {
          return d[secondCategoryId] * 1.1;
        });

        leftY.domain([minLeft, maxLeft]);
        rightY.domain([minRight, maxRight]);

        var axes = svg.append("g").attr("id", "axes");

        var slopepoints = svg
          .selectAll("slopepoints")
          .data(data)
          .enter()
          .append("g")
          .attr("class", "district slope");

        var leftAxis = d3.svg
          .axis()
          .scale(leftY)
          .orient("left")
          .ticks(0)
          .tickValues([minLeft, maxLeft])
          .tickFormat(function (d) {
            if (d >= 2000) {
              d = Math.round(d / 1000) * 1000;
            } else if (d >= 10) {
              d = Math.round(d);
            }
            return leftFormat(d);
          });
        //.tickFormat(d3.format(leftFormat));

        var rightAxis = d3.svg
          .axis()
          .scale(rightY)
          .orient("right")
          .tickValues([minRight, maxRight])
          .tickFormat(function (d) {
            if (d >= 2000) {
              d = Math.round(d / 1000) * 1000;
            } else if (d >= 10) {
              d = Math.round(d);
            }
            return rightFormat(d);
          });

        // Create SVG assets if this is the first time the function is executed.
        if (isInitialDraw) {
          isInitialDraw = false;

          // Axes and category headers

          axes.append("g").attr("class", "l axis").attr("transform", "translate(160, 0)");

          axes.append("g").attr("class", "r axis").attr("transform", "translate(320, 0)");

          axes
            .append("text")
            .attr("class", "legend left")
            .attr("text-anchor", "middle")
            .attr("transform", "translate(" + 120 + "," + -20 + ")");

          axes
            .append("text")
            .attr("class", "legend right")
            .attr("text-anchor", "middle")
            .attr("transform", "translate(" + 360 + "," + -20 + ")");

          // Draw lines before points, to go behind them.
          slopepoints
            .append("line")
            .attr("class", function (d) {
              if (d.isFeatured) {
                return "line featuredline";
              } else if (d.isStateAverage && showStateAverageInfo) {
                return "line stateline";
              } else if (d.isStateAverage && !showStateAverageInfo) {
                return "line hide";
              }
              return "line";
            })
            .attr("stroke-width", 1);

          // Left points
          slopepoints
            .append("circle")
            .attr("class", function (d) {
              if (d.isFeatured) {
                return "point left featuredfill";
              } else if (d.isStateAverage && showStateAverageInfo) {
                return "point left statefill";
              } else if (d.isStateAverage && !showStateAverageInfo) {
                return "point left hide";
              }
              return "point left";
            })
            .attr("r", "5");

          slopepoints
            .append("text")
            .attr("class", function (d) {
              if (d.isFeatured) {
                return "districttext left featuredfill";
              } else if (d.isStateAverage && showStateAverageInfo) {
                return "districttext left statefill";
              } else if (d.isStateAverage && !showStateAverageInfo) {
                return "districttext left hide";
              }
              return "districttext left hide";
            })
            .attr("text-anchor", "end");

          // Right points
          slopepoints
            .append("circle")
            .attr("class", function (d) {
              if (d.isFeatured) {
                return "point right featuredfill";
              } else if (d.isStateAverage && showStateAverageInfo) {
                return "point right statefill";
              } else if (d.isStateAverage && !showStateAverageInfo) {
                return "point right hide";
              }
              return "point right";
            })
            .attr("r", "5");

          slopepoints
            .append("text")
            .attr("class", function (d) {
              if (d.isFeatured) {
                return "districttext right featuredfill";
              } else if (d.isStateAverage && showStateAverageInfo) {
                return "districttext right statefill";
              } else if (d.isStateAverage && !showStateAverageInfo) {
                return "districttext right hide";
              }
              return "districttext right hide";
            })
            .attr("text-anchor", "start");
        }

        // Axes and category headers

        svg.selectAll(".l").call(leftAxis);

        svg.selectAll(".r").call(rightAxis);

        svg.selectAll(".legend.left").text(leftCategory.label);

        svg.selectAll(".legend.right").text(rightCategory.label);

        // Select SVG elements and draw (or transition) based on the data.

        svg
          .selectAll(".slope line")
          .data(data)
          .transition()
          .duration(transitionDuration)
          .attr("x1", 160)
          .attr("y1", function (d) {
            return leftY(d[firstCategoryId]);
          })
          .attr("x2", 320)
          .attr("y2", function (d) {
            return rightY(d[secondCategoryId]);
          });

        svg
          .selectAll(".slope circle.point.left")
          .data(data)
          .transition()
          .duration(transitionDuration)
          .attr("cx", 160)
          .attr("cy", function (d) {
            return leftY(d[firstCategoryId]);
          });

        svg
          .selectAll(".slope .districttext.left")
          .data(data)
          .transition()
          .duration(transitionDuration)
          .attr("x", 150)
          .attr("y", function (d) {
            return leftY(d[firstCategoryId]) + 3;
          })
          .text(function (d) {
            return d.district + " [" + leftFormat(d[firstCategoryId]) + "]";
          });

        svg
          .selectAll(".slope circle.point.right")
          .data(data)
          .transition()
          .duration(transitionDuration)
          .attr("cx", 320)
          .attr("cy", function (d) {
            return rightY(d[secondCategoryId]);
          });

        svg
          .selectAll(".slope .districttext.right")
          .data(data)
          .transition()
          .duration(transitionDuration)
          .attr("x", 330)
          .attr("y", function (d) {
            return rightY(d[secondCategoryId]) + 3;
          })
          .text(function (d) {
            return d.district + " [" + rightFormat(d[secondCategoryId]) + "]";
          });
      },
    };
  }
  // END Slopegraph().

  //
  // Scatterplot() object, which contains any functions for drawing scatters.
  //

  function Scatterplot() {
    clearChart();
    var isInitialDraw = true;
    var transitionDuration = 1000;

    var canvas = { width: 800, height: 540 };
    var margin = { top: 20, right: 20, bottom: 60, left: 100 };
    var width = canvas.width - margin.left - margin.right;
    var height = canvas.height - margin.top - margin.bottom;

    var svg = createSvgCanvas(canvas, margin);

    var x = d3.scale.linear().range([0, width]);
    var y = d3.scale.linear().range([height, 0]);

    // Fix IE 4px text offset bug
    var yTextOffset = 0;
    if (!!navigator.userAgent.match(/Trident/g) || !!navigator.userAgent.match(/MSIE/g)) {
      yTextOffset = 4;
    }

    return {
      drawChart: function (districts, categories, firstCategoryId, secondCategoryId) {
        var data = districts.data;

        var minX, minY, maxX, maxY;
        var line, linReg, linRegData;
        var xAxis, yAxis;

        // TODO: xCategory and yCtegory may be unneccessary if we use categories.getByKey(firstCategoryId).d3format;
        var xCategory = categories.getByKey(firstCategoryId);
        var yCategory = categories.getByKey(secondCategoryId);
        var xFormat = xCategory.d3format;
        var yFormat = yCategory.d3format;

        var stateAverage = districts.getStateAverage();
        var showStateAverageInfo =
          stateAverage && !!stateAverage[firstCategoryId] && !!stateAverage[secondCategoryId];
        var individualDistricts = districts.getIndividualDistricts();

        // The minimum values we want our graph axes to support. 0 may not be best, so we can customize.

        minX = d3.min(data, function (d) {
          if (scaleFromZero) {
            return 0;
          } else {
            if (firstCategoryId === "lowIncome") {
              return d[firstCategoryId] * 0.6;
            }
            return d[firstCategoryId] * 0.9;
          }
        });

        minY = d3.min(data, function (d) {
          if (scaleFromZero) {
            return 0;
          } else {
            if (secondCategoryId === "iar2019ELA" || secondCategoryId === "iar2019Math") {
              return d[secondCategoryId] * 0.6;
            }
            return d[secondCategoryId] * 0.9;
          }
        });

        // The maximum values we want our graph axes to support.

        maxX = d3.max(data, function (d) {
          return d[firstCategoryId] * 1.1;
        });

        maxY = d3.max(data, function (d) {
          return d[secondCategoryId] * 1.1;
        });

        x.domain([minX, maxX]);
        y.domain([minY, maxY]);

        xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(6).tickFormat(d3.format(xFormat));

        yAxis = d3.svg.axis().scale(y).orient("left").ticks(5).tickFormat(d3.format(yFormat));

        // Line function for averages and regressions.

        line = d3.svg
          .line()
          .x(function (d) {
            return x(d.base);
          })
          .y(function (d) {
            return y(d.key);
          });

        linReg = ss
          .linear_regression()
          .data(
            individualDistricts.map(function (d) {
              return [+d[firstCategoryId], +d[secondCategoryId]];
            })
          )
          .line();

        linRegData = x.domain().map(function (d) {
          return {
            base: +d,
            key: linReg(+d),
          };
        });

        var scatterpoints = svg
          .selectAll("g")
          .data(data)
          .enter()
          .append("g")
          .attr("class", "district");

        ////
        // CREATE OR UPDATE CHART, BASED ON isinitialDraw VALUE.

        if (isInitialDraw) {
          ////
          // CREATE CHART
          //

          isInitialDraw = false;

          ////
          // STATE AVERAGE DATA

          if (showStateAverageInfo) {
            svg
              .append("path")
              .datum([
                { base: minX, key: stateAverage[secondCategoryId] },
                {
                  base: maxX,
                  key: stateAverage[secondCategoryId],
                },
              ])
              .attr("class", "statekey stateline")
              .attr("d", line);

            svg
              .append("path")
              .datum([
                { base: stateAverage[firstCategoryId], key: minY },
                {
                  base: stateAverage[firstCategoryId],
                  key: maxY,
                },
              ])
              .attr("class", "statebase stateline")
              .attr("d", line);
          }

          ////
          // LINEAR REGRESSION LINES

          /* Not used, as of Jan 2017. Decomment to restore

          svg.append("path")
                  .datum(linRegData)
                  .attr("class", "trendline")
                  .attr("d", line);

          svg.append("text")
                  .attr("class", "legend")
                  .attr("text-anchor", "start")
                  .attr("transform", "translate(" + (10) + "," + (20) + ")")
                  .text("----- = expected score, based on benchmark districts");

          */

          ////
          // DRAW DATA POINTS AND SCORES

          scatterpoints
            .append("circle")
            .attr("class", function (d) {
              if (d.isFeatured) {
                return "point featuredfill";
              } else if (d.isStateAverage && showStateAverageInfo) {
                return "point statefill";
              } else if (d.isStateAverage && !showStateAverageInfo) {
                return "point hide";
              }
              return "point";
            })
            .attr("r", "13");

          scatterpoints.append("text").attr("class", function (d) {
            if (d.isStateAverage && !showStateAverageInfo) {
              return "scoretext hide";
            }
            return "scoretext";
          });

          ////
          // DISTRICT LABEL. (Loop to draw as a background outline, first.)

          // Using forEach() because d3 chains don't always play nicely with for() iterator vars.
          // Also saves worrying about an i var used elsewhere in this function.
          [0, 1].forEach(function (i) {
            scatterpoints.append("text").attr("class", function (d) {
              if (i === 0) {
                return "districtoutline";
              } else if (d.isFeatured) {
                return "districttext featuredfill";
              } else if (d.isStateAverage && showStateAverageInfo) {
                return "districttext statefill";
              } else if (d.isStateAverage && !showStateAverageInfo) {
                return "districttext hide";
              }
              return "districttext";
            });
          });

          ////
          // X AND Y AXES

          svg
            .append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0, " + height + ")");

          svg.append("g").attr("class", "y axis");

          svg
            .append("text")
            .attr("class", "chartkey label")
            .attr("text-anchor", "middle")
            .attr("transform", "translate(" + -75 + "," + height / 2 + ")rotate(-90)");

          svg
            .append("text")
            .attr("class", "chartbase label")
            .attr("text-anchor", "middle")
            .attr("transform", "translate(" + width / 2 + "," + (height + 45) + ")");
        }

        ////
        // UPDATE CHART
        //

        svg.selectAll(".x").transition().duration(transitionDuration).call(xAxis);

        svg.selectAll(".y").transition().duration(transitionDuration).call(yAxis);

        if (showStateAverageInfo) {
          svg
            .selectAll(".statebase")
            .datum([
              { base: stateAverage[firstCategoryId], key: minY },
              {
                base: stateAverage[firstCategoryId],
                key: maxY,
              },
            ])
            .transition()
            .duration(transitionDuration)
            .attr("d", line);

          svg
            .selectAll(".statekey")
            .datum([
              { base: minX, key: stateAverage[secondCategoryId] },
              {
                base: maxX,
                key: stateAverage[secondCategoryId],
              },
            ])
            .transition()
            .duration(transitionDuration)
            .attr("d", line);
        }

        // Create a line based on the beginning and endpoints of the linear regression range
        /* Not used, as of January 2017. Decomment to restore.
        svg.selectAll(".trendline")
                .datum(linRegData)
                .transition()
                .duration(transitionDuration)
                .attr("d", line);
        */

        svg
          .selectAll(".district circle")
          .data(data)
          .transition()
          .duration(transitionDuration)
          .attr("cx", function (d) {
            return x(d[firstCategoryId]);
          })
          .attr("cy", function (d) {
            return y(d[secondCategoryId]);
          });

        svg
          .selectAll(".district .scoretext")
          .data(data)
          .transition()
          .duration(transitionDuration)
          .attr("x", function (d) {
            return x(d[firstCategoryId]);
          })
          .attr("y", function (d) {
            return y(d[secondCategoryId]) + yTextOffset;
          })
          .text(function (d) {
            if (yCategory.isPercent) {
              return (d[secondCategoryId] * 100).toFixed(1);
            } else if (d[secondCategoryId] >= 2000) {
              return "$" + Math.round(d[secondCategoryId] / 1000) + "k";
            }
            return d[secondCategoryId];
          });

        [0, 1].forEach(function (i) {
          var classes = i === 0 ? ".district .districtoutline" : ".district .districttext";
          svg
            .selectAll(classes)
            .data(data)
            .transition()
            .duration(transitionDuration)
            .attr("x", function (d) {
              return x(d[firstCategoryId]) + 14;
            })
            .attr("y", function (d) {
              return y(d[secondCategoryId]) - 4;
            })
            .text(function (d) {
              return d.district;
            });
        });

        svg.selectAll(".chartkey").text("~ " + categories.getByKey(secondCategoryId).label + " ~");

        svg.selectAll(".chartbase").text("~ " + categories.getByKey(firstCategoryId).label + " ~");
      },
    };
  }
  // END Scatterplot().

  // Begin Bullet().
  // http://bl.ocks.org/mbostock/4061961
  //  http://www.d3noob.org/2013/07/introduction-to-bullet-charts-in-d3js.html
  function Bullet() {
    clearChart();
    var isInitialDraw = true;
    var transitionDuration = 1000;

    var canvas = { width: 300, height: 35 };
    var margin = { top: 5, right: 10, bottom: 17, left: 90 };
    var width = canvas.width - margin.left - margin.right;
    var height = canvas.height - margin.top - margin.bottom;

    return {
      drawChart: function (districts, categories, firstCategoryId, secondCategoryId) {
        clearChart();
        log("Drawing bullet chart.");

        function Bullets() {
          var data = copyObject(districts.data);
          dir(districts.data);
          dir(data);

          var i,
            len = data.length;
          var minval, maxval, stateData, featuredData;

          minval = d3.min(districts.data, function (d) {
            return d[firstCategoryId] * 0.9;
          });
          //log(minval);

          maxval = d3.max(districts.data, function (d) {
            return d[firstCategoryId] * 1.1;
          });
          //log(maxval);

          for (i = 0; i < len; i++) {
            if (data[i].isStateAverage) {
              stateData = data[i];
              data.splice(i, 1);
              break;
            }
          }
          //dir(stateData);

          for (i = 0; i < len; i++) {
            if (data[i].isFeatured) {
              featuredData = data[i];
              if (i > 0) {
                data.splice(i, 1); // Remove this object from data if it's not already the first element.
                data.unshift(featuredData); // Restore this object as the first element in data.
              }
              break;
            }
          }

          var firstFormat = categories.getByKey(firstCategoryId).d3format;

          var bullets = data.map(function (d) {
            var score = d[firstCategoryId];
            return {
              title: d.district,
              subtitle: "",
              ranges: [0, stateData[firstCategoryId], maxval],
              measures: [score],
              markers: [featuredData[firstCategoryId]],
              tickformat: [firstFormat],
              minval: [0],
            };
          });
          return bullets;
        }

        var chartData = Bullets();

        var chart = d3.bullet().width(width).height(height);

        var svg = $chart
          .selectAll("svg")
          .data(chartData)
          .enter()
          .append("svg")
          .attr("class", "bullet")
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
          .call(chart);

        var title = svg
          .append("g")
          .attr("class", "titlegroup")
          .style("text-anchor", "end")
          .attr("transform", "translate(-5," + (height - 3) + ")");

        title
          .append("text")
          .attr("class", "title")
          .text(function (d) {
            return d.title;
          });

        title
          .append("text")
          .attr("class", "subtitle")
          .attr("dy", "1em")
          .text(function (d) {
            return d.subtitle;
          });
      },
    };
  }
  // End Bullet().

  // Draw an HTML table with the data
  function drawDataTable(districts, categories) {
    var data = districts.getTabularData();
    var columns = Object.keys(data[0]);
    var table = d3.select("#data-table").append("table");
    var thead = table.append("thead");
    var tbody = table.append("tbody");
    var rows;

    thead
      .append("tr")
      .selectAll("th")
      .data(columns)
      .enter()
      .append("th")
      .text(function (key) {
        return categories.getByKey(key).header;
      });

    rows = tbody.selectAll("tr").data(data).enter().append("tr");

    rows
      .selectAll("td")
      .data(function (row) {
        return columns.map(function (column) {
          return { column: column, value: row[column] };
        });
      })
      .enter()
      .append("td")
      .html(function (d) {
        return d.value;
      });
  }

  // INIT FUNCTION
  function init(chart, categories, districts) {
    log("Initializing app with loaded data.");

    function Categories(data) {
      function Category(category) {
        this.key = category.key;
        this.header = category.header;
        this.d3format = category.d3format || "";
        this.label = category.label;
        this.isPercent = this.d3format.indexOf("%") > -1 || false;
      }

      this.data = data.map(function (d) {
        return new Category(d);
      });
      return this;
    }

    Categories.prototype = {
      getByKey: function (key) {
        var i = 0,
          len = this.data.length;
        for (; i < len; i++) {
          if (this.data[i].key === key) {
            return this.data[i];
          }
        }
        log("Categories.getByKey() couldn't find a category for this key: " + key + ".");
        return {};
      },
    };

    function Districts(data) {
      function District(district) {
        this.district = district.district;
        this.isStateAverage = ["true", "TRUE", true].indexOf(district.isStateAverage) > -1;
        this.isFeatured = ["true", "TRUE", true].indexOf(district.isFeatured) > -1;
        this.cost = +district.cost;
        this.lowIncome = (+district.lowIncome / 100).toFixed(3);
        //this.iar2019ELA = +district.iar2019ELA;
        //this.iar2019Math = +district.iar2019Math;
        //this.sat = +district.sat;
        this.classSize = +district.classSize;
        this.postSecondary = (+district.postSecondary / 100).toFixed(3);
        this.teacherSalary = +district.teacherSalary;
        this.limitedEnglish = (+district.limitedEnglish / 100).toFixed(3);
        this.graduationRate = (+district.graduationRate / 100).toFixed(3);
        this.pupilAdmin = +district.pupilAdmin;
        this.iep = (+district.iep / 100).toFixed(3);
      }

      this.data = data.map(function (d) {
        return new District(d);
      });
      return this;
    }

    Districts.prototype = {
      // Return only the state average District object.
      getStateAverage: function () {
        var i = 0,
          len = this.data.length;
        for (; i < len; i++) {
          if (this.data[i].isStateAverage) {
            return this.data[i];
          }
        }
        log("Districts.getStateAverage() couldn't find a state average object.");
        return {};
      },

      // Get all District objects _except_ the state average.
      getIndividualDistricts: function () {
        var districts = this.data.filter(function (d) {
          if (!d.isStateAverage) {
            return d;
          }
        });
        if (districts) {
          return districts;
        } else {
          log("Districts.getIndividualDistricts() couldn't find any individual districts.");
          return [];
        }
      },

      // Get rid of unnecessary columns (like isFeatured and isStateAverage) for data tables.
      getTabularData: function () {
        return (
          this.data.map(function (d) {
            function percentToTabularValue(p) {
              return (p * 100).toFixed(1);
            }

            var tabularData = JSON.parse(JSON.stringify(d));
            tabularData.lowIncome = percentToTabularValue(tabularData.lowIncome);
            tabularData.postSecondary = percentToTabularValue(tabularData.postSecondary);
            tabularData.limitedEnglish = percentToTabularValue(tabularData.limitedEnglish);
            tabularData.graduationRate = percentToTabularValue(tabularData.graduationRate);
            tabularData.iep = percentToTabularValue(tabularData.iep);
            delete tabularData.postSecondary;
            delete tabularData.isStateAverage;
            delete tabularData.isFeatured;
            return tabularData;
          }) || []
        );
      },
    };

    function getChartType(chart) {
      function showHideFormFields(c) {
        var i,
          $multi = document.querySelectorAll(".multi");
        if (c === "line" || c === "bullet") {
          for (i = 0; i < $multi.length; i++) {
            $multi[i].classList.add("hide");
          }
        } else {
          for (i = 0; i < $multi.length; i++) {
            $multi[i].classList.remove("hide");
          }
        }
      }

      if (chart) {
        showHideFormFields(chart);
        if (chart === "scatter") {
          log("Specified chart type is scatterplot.");
          return new Scatterplot();
        } else if (chart === "slope") {
          log("Specified chart type is slopegraph.");
          return new Slopegraph();
        } else if (chart === "line") {
          log("Specified chart type is lineplot.");
          return new Lineplot();
        } else if (chart === "bullet") {
          log("Specified chart type is bullet.");
          return new Bullet();
        } else {
          log("Unknown chart type specified.");
          return false;
        }
      } else {
        log("No chart type specified.");
        return false;
      }
    }

    // Fetch the data and start processing it.
    var myGraph = getChartType(chart);
    var myCategories = new Categories(categories);
    var myDistricts = new Districts(districts);
    var firstCategoryId = "cost"; // Default category.
    var secondCategoryId = "cost"; // Default category. "iar2019ELA";

    dir(myCategories);
    dir(myDistricts);

    ////
    // DRAW CHART AND CSV TABLE WITH DISTRICT INFO

    myGraph.drawChart(myDistricts, myCategories, firstCategoryId, secondCategoryId);
    drawDataTable(myDistricts, myCategories);

    ////
    // HANDLE USER EVENTS

    d3.select("#chart-select").on("change", function () {
      myGraph = getChartType(this.value);
      myGraph.drawChart(myDistricts, myCategories, firstCategoryId, secondCategoryId);
    });

    d3.select("#data-checkbox").on("change", function () {
      if (document.getElementById("data-checkbox").checked) {
        document.getElementById("data-table").classList.remove("hide");
      } else {
        document.getElementById("data-table").classList.add("hide");
      }
    });

    d3.select("#data-zero").on("change", function () {
      scaleFromZero = document.getElementById("data-zero").checked;
      myGraph.drawChart(myDistricts, myCategories, firstCategoryId, secondCategoryId);
    });

    d3.select("#y-select").on("change", function () {
      secondCategoryId = this.value;
      myGraph.drawChart(myDistricts, myCategories, firstCategoryId, secondCategoryId);
    });

    d3.select("#x-select").on("change", function () {
      firstCategoryId = this.value;
      myGraph.drawChart(myDistricts, myCategories, firstCategoryId, secondCategoryId);
    });
  }

  ////
  // IpsdData startup function. Gets CSV data, and then runs init().

  function IpsdData(chart) {
    log("Chart type: " + chart + ".");
    log("Loading CSV data.");

    /*
    log("Showing/hiding data table");
    if (document.getElementById("data-checkbox").checked) {
      document.getElementById("data-table").classList.remove("hide");
    } else {
      document.getElementById("data-table").classList.add("hide");
    }
    */

    var categoriesCsvUrl = "ChartCategories.csv";
    var districtsCsvUrl = "DistrictTestData2021.csv";

    d3_queue
      .queue()
      .defer(d3.csv, categoriesCsvUrl)
      .defer(d3.csv, districtsCsvUrl)
      .await(function (error, categories, districts) {
        if (!error && categories && districts) {
          init(chart, categories, districts);
        } else if (error) {
          log("Error retrieving CSV data: \n" + error);
        } else {
          log("No CSV data retrieved, but no error detected in process.");
        }
      });
  }
})();
