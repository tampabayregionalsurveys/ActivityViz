//encapsulate all code within a IIFE (Immediately-invoked-function-expression) to avoid polluting global namespace
//global object sunburst will contain functions and variables that must be accessible from elsewhere
var SunburstChart = {
  sunburst: function sunburst(id, indx) {
    "use strict";
    var region = abmviz_utilities.GetURLParameter("region");
    var dataLocation = localStorage.getItem(region);
    var url = dataLocation + abmviz_utilities.GetURLParameter("scenario");
    var fileName = "TreeMapData.csv";
    var scenario = abmviz_utilities.GetURLParameter("scenario");
    //var url = "../data/" + abmviz_utilities.GetURLParameter("scenario") + "/visit-sequences.csv";
    var legendBoxWidth = 150;
    var legendDepthIndent = 10;
    var dataInitialized = false;
    let json = null;
    var maxDepth;
    var nodeVisuals;
    var legendRects;
    var legendTexts;
    var legendGroups;
    var valueColumn;
    var nodeDataDisabled = new Set();
    var negativePrefix = "- ";
    var originalNodeData;
    var radius, x, y, svg, arc;
    var showChartOnPage = true;
    var chartType = 1;
    let waffleRow = 10;
    let waffleColumn = 10;
    let waffleBlockSize = 25;
    //chart type 1 = sunburst, chart type 2 == pie chart type 3 is waffle
    var infoBox;
    // Dimensions of legend item: width, height, spacing, radius of rounded rect.
    var li = {
      w: legendBoxWidth,
      h: 22,
      s: 3,
      r: 3
    };
    var colors = {}; //will be filled in to map keys to colors
    // Total size of all segments; we set this later, after loading the data.
    var totalSize;
    var pageTitle = $(".page-title");
    var CUSTOM_TITLE = "";

    function createSunburst() {
      //read in data and create sunburst when finished

      if (json === null) {
        d3.text(url, function(error, data) {
          "use strict";
          if (error) {
            $("#sunburst").html(
              "<div class='container'><h3><span class='alert alert-danger'>Error: An error occurred while loading the sunburst data.</span></h3></div>"
            );
            throw error;
          }
          var csv = d3.csv.parseRows(data);
          var headers = csv[0];
          var maingroupColumn = headers[0];
          var subgroupColumn = headers[1];
          var quantityColumn = headers[2];
          if (!$.fn.DataTable.isDataTable("#" + id + "-datatable-table")) {
            var columnsDT = [];
            $.each(headers, function(d, i) {
              columnsDT.push({ title: i });
              $("#" + id + "-datatable-div table thead tr").append(
                "<th>" + i + "</th>"
              );
            });

            $("#" + id + "-datatable-table").DataTable({
              dom: "Bfrtip",
              buttons: {
                dom: {
                  button: {
                    tag: "button",
                    className: ""
                  }
                },

                buttons: [
                  {
                    extend: "csv",
                    className: "btn",
                    text: '<span class="glyphicon glyphicon-save"></span>',
                    titleAttr: "Download CSV"
                  }
                ]
              },
              data: csv.slice(1),
              columns: columnsDT
            });
          }

          if (!CUSTOM_TITLE) {
            d3.selectAll(".sunburst-maingroup").html(maingroupColumn);
          }

          try {
            json = buildHierarchy(csv);
            if (chartType == 1) {
              originalNodeData = createVisualization();
              drawLegend(originalNodeData);
            } else if (chartType == 2) {
              pieChart();
            } else if (chartType == 3) {
              wafflePieChart();
            }
          } catch (err) {
            if (json === null)
              $("#sunburst").html(
                "<div class='container'><h3><span class='alert alert-danger'>Error: An error occurred while loading the sunburst data.</span></h3></div>"
              );
          }
        }); //end d3.text
      } else {
        //if already exists don't need to read in and parse again
        if (chartType == 1) {
          createVisualization();
        } else if (chartType == 2) {
          pieChart();
        } else if (chartType == 3) {
          wafflePieChart();
        }
      }

      function pieChart() {
        d3.select("#" + id + "-legend svg").remove(); //remove in case this is a window resize event
        d3.select("#" + id + "-chart svg").remove(); //in case window resize delete contents
        var width = 960,
          height = 500,
          radius = Math.min(width, height) / 2;

        var color = d3.scale.category20();

        var arc = d3.svg
          .arc()
          .outerRadius(radius - 10)
          .innerRadius(0);

        var pie = d3.layout
          .pie()
          .sort(null)
          .value(function(d) {
            return d.value;
          });

        var svg = d3
          .select("#" + id + "-chart")
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .append("g")
          .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

        var partition = d3.layout.partition().value(function(d) {
          return d.size;
        });
        let total;
        var nodeData = partition.nodes(json);

        //value of a square
        var childData = nodeData.filter(d => d.children == undefined);
        //total
        total = d3.sum(childData, function(d) {
          return d.value;
        });
        childData.sort(function(x, y) {
          return d3.descending(x.value, y.value);
        });

        var g = svg
          .selectAll(".arc")
          .data(pie(childData))
          .enter()
          .append("g")
          .attr("class", "arc");

        g.append("path")
          .attr("d", arc)
          .attr("data-legend", function(d) {
            return d.name;
          })
          .attr("data-legend-pos", function(d, i) {
            return i;
          })
          .style("fill", function(d) {
            return color(childData.indexOf(d.data));
          })
          .on("mouseover", mouseover)
          .on("mouseout", mouseout)
          .on("mousemove", mousemove);

        g.append("text")
          .attr("transform", function(d) {
            return "translate(" + arc.centroid(d) + ")";
          })
          .attr("dy", ".35em")
          .style("text-anchor", "middle");

        var legend = d3
          .select("#" + id + "-legend")
          .append("svg")
          .attr("width", 300)
          .attr("height", 400)
          .append("g")
          .selectAll("div")
          .data(childData)
          .enter()
          .append("g")
          .attr("transform", function(d, i) {
            return "translate(0," + i * 20 + ")";
          });
        legend
          .append("rect")
          .attr("width", 18)
          .attr("height", 18)
          .style("fill", function(d, i) {
            return color(childData.indexOf(d));
          })
          .on("mouseover", mouseoverLeg)
          .on("mouseout", mouseout)
          .on("mousemove", mousemove);
        legend
          .append("text")
          .attr("x", 25)
          .attr("y", 13)
          .text(function(d) {
            return d.name;
          })
          .style("fill", "black")
          .on("mouseover", mouseoverLeg)
          .on("mouseout", mouseout)
          .on("mousemove", mousemove);

        function mouseover(d) {
          console.log(d);
          d3.select("#" + id + "-chart")
            .selectAll("g.arc path")
            .transition()
            .duration(100)
            .style("opacity", 0.2);
          d3.select("#" + id + "-chart")
            .selectAll(
              'path[data-legend-pos="' + childData.indexOf(d.data) + '"]'
            )
            .transition()
            .duration(100)
            .style("opacity", 1);

          // d3.select('#'+id+'-chart').selectAll('rect[rectgrp=').transition().duration(100).style('opacity',0.2);
          showToolTipInfo(d);
        }
        function mouseoverLeg(d) {
          console.log(d);
          d3.select("#" + id + "-chart")
            .selectAll("g.arc path")
            .transition()
            .duration(100)
            .style("opacity", 0.2);
          d3.select("#" + id + "-chart")
            .selectAll('path[data-legend-pos="' + childData.indexOf(d) + '"]')
            .transition()
            .duration(100)
            .style("opacity", 1);
          // d3.select('#'+id+'-chart').selectAll('rect[rectgrp=').transition().duration(100).style('opacity',0.2);
          showToolTipInfo(d);
        }
        function mouseout(d) {
          d3.select("#" + id + "-chart")
            .selectAll("g.arc path")
            .transition()
            .duration(100)
            .style("opacity", 1);
          hideToolTipSide();
        }
        function mousemove(d) {}
        function showToolTipInfo(d) {
          let currentNode;
          if (d.data == undefined) {
            currentNode = childData.find(x => x.name == d.name);
          } else {
            currentNode = childData.find(x => x.name == d.data.name);
          }

          var percentage = ((100 * currentNode.value) / total).toPrecision(3);
          var percentageString = percentage + "%";
          if (percentage < 0.1) {
            percentageString = "< 0.1%";
          }
          d3.select("#" + id + "-percentage").text(percentageString);
          d3.select("#" + id + "-current-node").text(currentNode.name);

          d3.select("#" + id + "-current-node-value").text(
            getReadableValueString(currentNode.value)
          );
          d3.select("#" + id + "-explanation").style("visibility", "");
          console.log(currentNode);
        }
        function hideToolTipSide() {
          d3.select("#" + id + "-explanation").style("visibility", "hidden");
        }
      }

      function wafflePieChart() {
        d3.select("#" + id + "-legend svg").remove(); //remove in case this is a window resize event
        d3.select("#" + id + "-chart svg").remove(); //in case window resize delete contents

        var total = 0;
        var width,
          height,
          widthSquares = waffleRow,
          heightSquares = waffleColumn,
          squareSize = waffleBlockSize,
          squareValue = 0,
          gap = 2,
          theData = [];
        var col, row;

        var partition = d3.layout.partition().value(function(d) {
          return d.size;
        });

        var nodeData = partition.nodes(json);
        var color = d3.scale.category20();

        //now for all lower level objects, set the color as a scaled luminance copy of the base color of the top level

        var childData = nodeData.filter(d => d.children == undefined);
        //total
        total = d3.sum(childData, function(d) {
          return d.value;
        });

        //value of a square
        squareValue = total / (widthSquares * heightSquares);
        childData.sort(function(x, y) {
          return d3.descending(x.value, y.value);
        });
        let combineData = [];
        childData.forEach(function(d, i) {
          if ((d.value / squareValue).toFixed(2) < 1) {
            if (combineData.findIndex(x => x.name == "Other") > -1) {
              let idx = combineData.findIndex(x => x.name == "Other");
              combineData[idx].value += d.value;
            } //we have an other already
            else {
              combineData.push({ name: "Other", value: d.value });
            }
          } else {
            combineData.push(d);
          }
        });
        combineData.sort(function(x, y) {
          return d3.descending(x.value, y.value);
        });
        //remap data
        combineData.forEach(function(d, i) {
          d.units = Math.floor(d.value / squareValue);
          d.unitVal = (d.value / squareValue).toFixed(2);
          theData = theData.concat(
            Array(d.units + 1)
              .join(1)
              .split("")
              .map(function() {
                return {
                  squareValue: squareValue,
                  units: d.units,
                  unitVal: d.unitVal,
                  value: d.value,
                  groupIndex: i
                };
              })
          );
        });
        let leftover = 100 - theData.length;
        for (let i = 0; i < leftover; i++) {
          let lastIdx = theData.find(x => x.groupIndex == i);
          //let copyme = theData[lastIdx];
          theData.push(lastIdx);
        }
        theData.sort(function(x, y) {
          return d3.ascending(x.groupIndex, y.groupIndex);
        });
        height = squareSize * widthSquares + widthSquares * gap + 25;
        width = squareSize * heightSquares + heightSquares * gap + 25;
        let rowArray = [];
        for (let i = 0; i < heightSquares; i++) {
          let row = i % heightSquares;

          rowArray.push(row);
        }
        var waffle = d3
          .select("#" + id + "-chart")
          .append("svg")
          .attr("width", width)
          .attr("height", height)
          .style("margin-left", "auto")
          .style("margin-right", "auto")
          .style("display", "block")
          .append("g")
          .selectAll("div")
          .data(theData)
          .enter()
          .append("rect")
          .attr("width", squareSize)
          .attr("height", squareSize)
          .attr("fill", function(d) {
            return color(d.groupIndex);
          })
          .attr("x", function(d, i) {
            //group n squares for column
            row = rowArray[i % heightSquares]; //i % heightSquares;
            if (i % heightSquares == 9) {
              rowArray.reverse();
            }
            return heightSquares * squareSize - (row * squareSize + row * gap);
          })
          .attr("rectgrp", function(d, i) {
            return combineData[d.groupIndex].name;
          })
          .attr("y", function(d, i) {
            col = Math.floor(i / heightSquares);
            return col * squareSize + col * gap;
          })
          .style("opacity", 1)
          .on("mouseover", mouseover)
          .on("mouseout", mouseout)
          .on("mousemove", mouseover)
          .append("title")
          .text(function(d, i) {
            return (
              combineData[d.groupIndex].name +
              " | " +
              d.value.toLocaleString() +
              " , " +
              d.unitVal +
              "%"
            );
          });

        //add legend with categorical data
        var legend = d3
          .select("#" + id + "-legend")
          .append("svg")
          .attr("width", 300)
          .attr("height", 200)
          .append("g")
          .selectAll("div")
          .data(combineData)
          .enter()
          .append("g")
          .attr("transform", function(d, i) {
            return "translate(0," + i * 20 + ")";
          });
        legend
          .append("rect")
          .attr("width", 18)
          .attr("height", 18)
          .style("fill", function(d, i) {
            return color(combineData.indexOf(d));
          })
          .on("mouseover", mouseoverLeg)
          .on("mouseout", mouseout)
          .on("mousemove", mousemove);
        legend
          .append("text")
          .attr("x", 25)
          .attr("y", 13)
          .text(function(d) {
            return d.name;
          })
          .style("fill", "black")
          .on("mouseover", mouseoverLeg)
          .on("mouseout", mouseout)
          .on("mousemove", mousemove);

        function mouseover(d) {
          console.log(d);
          d3.select("#" + id + "-chart")
            .selectAll("rect")
            .transition()
            .duration(100)
            .style("opacity", 0.2);

          d3.select("#" + id + "-chart")
            .selectAll("rect[rectgrp='" + combineData[d.groupIndex].name + "']")
            .transition()
            .duration(100)
            .style("opacity", 1);
          // d3.select('#'+id+'-chart').selectAll('rect[rectgrp=').transition().duration(100).style('opacity',0.2);
          showToolTipInfo(d);
        }
        function mouseoverLeg(d) {
          console.log(d);
          d3.select("#" + id + "-chart")
            .selectAll("rect")
            .transition()
            .duration(100)
            .style("opacity", 0.2);
          d3.select("#" + id + "-chart")
            .selectAll("rect[rectgrp='" + d.name + "']")
            .transition()
            .duration(100)
            .style("opacity", 1);
          // d3.select('#'+id+'-chart').selectAll('rect[rectgrp=').transition().duration(100).style('opacity',0.2);
          showToolTipInfo(d);
        }
        function mouseout(d) {
          d3.select("#" + id + "-chart")
            .selectAll("rect")
            .transition()
            .duration(100)
            .style("opacity", 1);
          hideToolTipSide();
        }
        function mousemove(d) {}
        function showToolTipInfo(d) {
          let currentNode;
          if (d.name == undefined) {
            currentNode = combineData[d.groupIndex];
          } else {
            currentNode = combineData.find(x => x.name == d.name);
          }
          var percentage = ((100 * currentNode.value) / total).toPrecision(3);
          var percentageString = percentage + "%";
          if (percentage < 0.1) {
            percentageString = "< 0.1%";
          }
          d3.select("#" + id + "-percentage").text(percentageString);
          d3.select("#" + id + "-current-node").text(currentNode.name);

          d3.select("#" + id + "-current-node-value").text(
            getReadableValueString(currentNode.value)
          );
          d3.select("#" + id + "-explanation").style("visibility", "");
          console.log(currentNode);
        }
        function hideToolTipSide() {
          d3.select("#" + id + "-explanation").style("visibility", "hidden");
        }
      }

      //https://bl.ocks.org/kerryrodden/7090426
      // Main function to draw and set up the visualization, once we have the data.
      function createVisualization() {
        // Basic setup of page elements.
        var sunburstBounds = d3
          .select("#" + id + "-chart")
          .node()
          .getBoundingClientRect();
        //Sequences sunburst https://bl.ocks.org/kerryrodden/7090426
        // Dimensions of sunburst.
        var width = Math.min(600, sunburstBounds.width);
        var height = width;
        d3.select("#" + id + "-chart svg").remove(); //in case window resize delete contents
        radius = Math.min(width, height) / 2;

        var partition = d3.layout.partition().value(function(d) {
          return d.size;
        });

        var nodeData = partition.nodes(json);

        // Get total size of the tree = value of root node from partition.
        totalSize = nodeData[0].value;
        //this function can be called multiple times since nodes can be disabled and the chart re-made
        //the first time through assign base colors and don't change since wish colors assignments not to change.'
        if (originalNodeData == undefined) {
          //assign each node a color. Also assign each node a unique id since depth and name may not be unique
          var c10 = d3.scale.category10();
          //set baseColors for all the top level objects
          var numDepth1 = 0;
          nodeData.forEach(function(d, i) {
            if (d.depth == 1) {
              d.baseColor = d3.lab(c10(numDepth1));
              numDepth1 += 1;
              colors[d.uniqueId] = d.baseColor;
            }
          });
        } //end if originalNodeData undefined

        //each time though need to set the luminance scale for each baseColor since the total may be different
        //assign each node a color. Also assign each node a unique id since depth and name may not be unique
        maxDepth = 0;
        nodeData.forEach(function(d, i) {
          maxDepth = Math.max(d.depth + 1, maxDepth);
          if (d.depth == 1) {
            d.luminance = d3.scale
              .sqrt()
              .domain([0, d.value])
              .clamp(true)
              .range([90, 20]);
            d.baseColor.l = d.luminance(d.value);
            colors[d.uniqueId] = d.baseColor;
          }
        });

        //now for all lower level objects, set the color as a scaled luminance copy of the base color of the top level
        nodeData.forEach(function(d, i) {
          if (d.depth > 1) {
            var p = d;
            while (p.depth > 1) p = p.parent;
            var topAncestor = p;
            var c = d3.lab(topAncestor.baseColor);
            c.l = topAncestor.luminance(d.value);
            colors[d.uniqueId] = c;
          }
        });

        var formatNumber = d3.format(",d");

        x = d3.scale.linear().range([0, 2 * Math.PI]);

        y = d3.scale.sqrt().range([0, radius]);

        var color = d3.scale.category20c();

        arc = d3.svg
          .arc()
          .startAngle(function(d) {
            return Math.max(0, Math.min(2 * Math.PI, x(d.x)));
          })
          .endAngle(function(d) {
            return Math.max(0, Math.min(2 * Math.PI, x(d.x + d.dx)));
          })
          .innerRadius(function(d) {
            return Math.max(0, y(d.y));
          })
          .outerRadius(function(d) {
            return Math.max(0, y(d.y + d.dy));
          });

        svg = d3
          .select("#" + id + "-chart")
          .append("svg")
          .attr("id", id + "-container")
          .attr("width", width)
          .attr("height", height)
          .append("g")
          .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");
        nodeVisuals = svg
          .selectAll("path")
          .data(nodeData)
          .enter()
          .append("path")
          .attr("d", arc)
          .attr("class", "sunburst-node")
          .attr("fill-rule", "evenodd")
          .style("fill", function(d) {
            return d.uniqueId == 0 ? "#d3d3d3" : colors[d.uniqueId];
          })
          .on("click", clickOnNodeVisual)
          .on("mouseover", mouseoverNode);

        nodeVisuals.append("title").text(function(d) {
          return d.name + "\n" + formatNumber(d.value);
        });

        // Add the mouseleave handler to the bounding circle.
        d3.select("#" + id + "-container").on("mouseleave", mouseleave);
        nodeVisuals.classed("sunburst-negative", function(d) {
          return d.name.startsWith(negativePrefix);
        });
        return nodeData;
      } //end createVisualization

      function clickOnNodeVisual(d) {
        console.log(
          "clickOnNodeVisual depth: " +
            d.depth +
            " unique id: " +
            d.uniqueId +
            " d.name: " +
            d.name
        );
        var sequenceArray = getDescendants(d);
        arrangeLegendRects(sequenceArray);
        svg
          .transition()
          .duration(750)
          .tween("scale", function() {
            var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
              yd = d3.interpolate(y.domain(), [d.y, 1]),
              yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
            return function(t) {
              x.domain(xd(t));
              y.domain(yd(t)).range(yr(t));
            };
          })
          .selectAll("path")
          .attrTween("d", function(d) {
            return function() {
              return arc(d);
            };
          });
      } //end clickOnNodeVisual

      function showNodeExplanation(node) {
        var percentage = ((100 * node.value) / totalSize).toPrecision(3);
        var percentageString = percentage + "%";
        if (percentage < 0.1) {
          percentageString = "< 0.1%";
        }
        d3.select("#" + id + "-percentage").text(percentageString);
        d3.select("#" + id + "-current-node").text(node.name);
        d3.select("#" + id + "-current-node-value").text(
          getReadableValueString(node.value)
        );
        d3.select("#" + id + "-explanation")
          .style("visibility", "")
          .classed("sunburst-negative", function(d) {
            return node.name.startsWith(negativePrefix);
          });
      }

      function hideNodeExplanation() {
        d3.select("#" + id + "-explanation").style("visibility", "hidden");
      }

      // Fade all but the current sequence, and show it sorted to the top of the legend.
      function mouseoverNode(d) {
        showNodeExplanation(d);
        // 			var sequenceArray = getAncestors(d);
        // 			arrangeLegendRects(sequenceArray);
      } //end mouseoverNode

      function arrangeLegendRects(sequenceArray) {
        //move the legend rects of the current sequence array to the top, similar to a breadcrumb trail
        var numSequenceMembersFound = 0;
        legendGroups
          .transition()
          .duration(500)
          .attr("transform", function(d, i) {
            var xTranslation = i * (li.h + li.s);
            var sequenceIndex = sequenceArray.indexOf(d);
            if (sequenceIndex >= 0) {
              xTranslation = sequenceIndex * (li.h + li.s);
              numSequenceMembersFound += 1;
            } else {
              xTranslation =
                (sequenceArray.length + i - numSequenceMembersFound + 1) *
                (li.h + li.s);
            }
            return "translate(" + getDepthIndent(d) + "," + xTranslation + ")";
          });
        // Fade all segments not in sequenceArray.
        dimAllBut(nodeVisuals, sequenceArray);
        dimAllBut(legendRects, sequenceArray);
      } //arrangeLegendRects

      // Restore everything to full opacity when moving off the visualization.
      function mouseleave(d) {
        // 			// Deactivate all segments during transition.
        // 			unDimClass(nodeVisuals);
        // 			unDimClass(legendRects);
        // 			legendGroups.transition().duration(500).attr("transform", function (d, i) {
        // 				return "translate(" + getDepthIndent(d) + "," + i * (li.h + li.s) + ")";
        // 			});
        hideNodeExplanation();
      }

      // Given a node in a partition layout, return an array of all of its ancestor
      // nodes, highest first, but excluding the root.
      function getAncestors(node) {
        var path = [];
        var current = node;
        while (current.parent) {
          path.unshift(current);
          current = current.parent;
        }
        return path;
      }

      // Given a node in a partition layout, return an array of all of its descendant
      // nodes, highest first, but excluding the root.
      function getDescendants(node) {
        var path = [node];
        if (node.children) {
          node.children.forEach(function(childNode) {
            var descendants = getDescendants(childNode);
            descendants.forEach(function(descendant) {
              path.push(descendant);
            });
          });
        }
        return path;
      }

      function getReadableValueString(valueToConvert) {
        var i = -1;
        var numberUnits = [
          " thousand",
          " million",
          " billion",
          " trillion",
          "PB",
          "EB",
          "ZB",
          "YB"
        ];
        do {
          valueToConvert = valueToConvert / 1000;
          i++;
        } while (valueToConvert > 1000);
        return Math.max(valueToConvert, 0.1).toFixed(1) + numberUnits[i];
      }

      function getDepthIndent(d) {
        return d.depth * legendDepthIndent;
      }

      function dimAllBut(selection, undimmed) {
        selection.classed("sunburst-dimmed", function(d) {
          return undimmed.indexOf(d) == -1;
        });
      }

      function unDimClass(selection) {
        selection.classed("sunburst-dimmed", false);
      }

      function drawLegend() {
        d3.select("#" + id + "-legend svg").remove(); //remove in case this is a window resize event
        //for height leave an extra slot so that when showing active nodes at top can have a space separating from rest of legend
        var totalLegendHeight = (originalNodeData.length + 1) * (li.h + li.s);
        var legend = d3
          .select("#" + id + "-legend")
          .append("svg:svg")
          .attr("width", legendBoxWidth + (maxDepth - 1) * legendDepthIndent)
          .attr("height", totalLegendHeight)
          .on("mouseleave", function() {
            // 				unDimClass(nodeVisuals);
            // 				unDimClass(legendRects);
            d3.select("#" + id + "-explanation").style("visibility", "hidden");
          });
        legendGroups = legend
          .selectAll("g")
          .data(originalNodeData)
          .enter()
          .append("svg:g")
          .attr("transform", function(d, i) {
            return (
              "translate(" + getDepthIndent(d) + "," + i * (li.h + li.s) + ")"
            );
          });
        legendRects = legendGroups
          .append("svg:rect")
          .attr("rx", li.r)
          .attr("ry", li.r)
          .attr("width", li.w)
          .attr("height", li.h)
          .style("fill", function(d) {
            return colors[d.uniqueId];
          })
          .on("mouseover", function(d, i) {
            // 				dimAllBut(nodeVisuals, [d]);
            // 				dimAllBut(legendRects, [d]);
            showNodeExplanation(d);
          })
          .on("click", clickOnNodeVisual);
        legendTexts = legendGroups
          .append("svg:text")
          .attr("x", li.w / 2)
          .attr("y", li.h / 2)
          .attr("dy", "0.35em")
          .attr("text-anchor", "middle")
          .text(function(d) {
            return d.name;
          })
          .on("click", clickOnNodeVisual);
        legendRects.classed("sunburst-negative", function(d) {
          return d.name.startsWith(negativePrefix);
        });
      } //end drawLegend

      // Take a multi-column CSV and transform it into a hierarchical structure suitable
      // for a partition layout. The first column to the next to last column is a sequence of step names, from
      // root to leaf. The last column is a count of how
      // often that sequence occurred.
      function buildHierarchy(csv) {
        var uniqueId = 0;
        var root = {
          name: "ALL",
          uniqueId: uniqueId++,
          children: []
        };
        for (var rowIndex = 0; rowIndex < csv.length; rowIndex++) {
          var row = csv[rowIndex];
          //remove any consecutive duplicates
          var lastCellString = row[0];
          for (var columnIndex = 1; columnIndex < row.length; columnIndex++) {
            if (row[columnIndex] === lastCellString) {
              row.splice(columnIndex, 1);
              columnIndex--;
            }
          }
          //support unbalanced trees where each row could go a different depth
          var numColumns = row.length;
          while (row[numColumns - 1].length == 0) {
            numColumns -= 1;
          }
          var parts = row.slice(0, numColumns - 1);
          var size = +row[numColumns - 1];
          if (isNaN(size)) {
            // e.g. if this is a header row
            continue;
          }
          var isNegative = size < 0;
          if (isNegative) {
            size = Math.abs(size);
          }
          var currentNode = root;
          for (var j = 0; j < parts.length; j++) {
            var children = currentNode["children"];
            var nodeName = parts[j];
            if (isNegative) {
              nodeName = negativePrefix + nodeName;
            }
            var childNode;
            if (j + 1 < parts.length) {
              // Not yet at the end of the sequence; move down the tree.
              var foundChild = false;
              for (var k = 0; k < children.length; k++) {
                if (children[k]["name"] == nodeName) {
                  childNode = children[k];
                  foundChild = true;
                  break;
                }
              }
              // If we don't already have a child node for this branch, create it.
              if (!foundChild) {
                childNode = {
                  name: nodeName,
                  uniqueId: uniqueId++,
                  isNegative: isNegative,
                  children: []
                };
                children.push(childNode);
              }
              currentNode = childNode;
            } else {
              // Reached the end of the sequence; create a leaf node.
              childNode = {
                name: nodeName,
                uniqueId: uniqueId++,
                isNegative: isNegative,
                size: size
              };
              children.push(childNode);
            }
          }
        }
        return root;
      }
    } //end createSunburst

    if (showChartOnPage) {
      $.getJSON(dataLocation + "region.json", function(data) {
        var configName = "Default";
        if (data["scenarios"][scenario].visualizations != undefined) {
          if (
            data["scenarios"][scenario].visualizations["Sunburst"][indx].file
          ) {
            fileName =
              data["scenarios"][scenario].visualizations["Sunburst"][indx].file;
            var infoBox;
            if (
              data["scenarios"][scenario].visualizations["Sunburst"][indx].info
            ) {
              infoBox =
                data["scenarios"][scenario].visualizations["Sunburst"][indx]
                  .info;
              $("#" + id + "-div span.glyphicon-info-sign").attr(
                "title",
                infoBox
              );
              $("#" + id + '-div [data-toggle="tooltip"]').tooltip();
            }
          }
          if (
            data["scenarios"][scenario].visualizations["Sunburst"][indx].config
          ) {
            configName =
              data["scenarios"][scenario].visualizations["Sunburst"][indx]
                .config;
          }
          if (
            data["scenarios"][scenario].visualizations["Sunburst"][indx]
              .datafilecolumns
          ) {
            var datacols =
              data["scenarios"][scenario].visualizations["Sunburst"][indx]
                .datafilecolumns;
            $.each(datacols, function(key, value) {
              $("#" + id + "-datatable-columns").append(
                "<p>" + key + ": " + value + "</p>"
              );
            });
          }

          CUSTOM_TITLE =
            data["scenarios"][scenario].visualizations["Sunburst"][indx].title;

          if (CUSTOM_TITLE) {
            pageTitle.html(CUSTOM_TITLE);
          }

          var configSettings = data["Sunburst"][configName];

          if (configSettings != undefined) {
            $.each(configSettings, function(opt, value) {
              if (opt == "ChartType") {
                chartType = value;
              }
              if (opt == "BlockSize") {
                waffleBlockSize = value;
              }
              if (opt == "WaffleRow") {
                waffleRow = value;
              }
              if (opt == "WaffleColumn") {
                waffleColumn = value;
              }
            });
          }
        }
      }).complete(function() {
        url += "/" + fileName;
        createSunburst();
      });
      window.addEventListener("resize", function() {
        console.log("Got resize event. Calling sunburst");
        createSunburst();
      });
    }
    //return only the parts that need to be global
    return {};
  }
}; //end encapsulating IIFE
