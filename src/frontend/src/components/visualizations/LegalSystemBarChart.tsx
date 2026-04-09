'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { BarChartData } from '@/types/visualization';

interface LegalSystemBarChartProps {
  data: BarChartData[];
  width?: number;
  height?: number;
}

const LegalSystemBarChart = ({ data, width = 800, height = 500 }: LegalSystemBarChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      setError('No data available for bar chart');
      setLoading(false);
      return;
    }

    try {
      // Clear previous chart
      d3.select(svgRef.current).selectAll('*').remove();

      // Set up margins and dimensions
      const margin = { top: 40, right: 30, bottom: 80, left: 60 };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;

      // Create SVG
      const svg = d3.select(svgRef.current)
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

      // Create scales
      const xScale = d3.scaleBand()
        .domain(data.map(d => d.legalSystem))
        .range([0, chartWidth])
        .padding(0.2);

      const yScale = d3.scaleLinear()
        .domain([0, (d3.max(data, d => d.count) as number) * 1.1])
        .range([chartHeight, 0]);

      // Add X axis
      svg.append('g')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end')
        .attr('font-size', '12px');

      // Add Y axis
      svg.append('g')
        .call(d3.axisLeft(yScale))
        .append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', 6)
        .attr('dy', '0.71em')
        .attr('text-anchor', 'end')
        .text('Count')
        .attr('font-weight', 'bold');

      // Add bars
      svg.selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', d => xScale(d.legalSystem) || 0)
        .attr('y', d => yScale(d.count) || 0)
        .attr('width', xScale.bandwidth())
        .attr('height', d => chartHeight - (yScale(d.count) || 0))
        .attr('fill', '#4F46E5')
        .attr('rx', 4)
        .attr('ry', 4)
        .on('mouseover', function(event, d) {
          d3.select(this).attr('fill', '#3730A3');
          
          // Show tooltip
          svg.append('text')
            .attr('id', 'tooltip')
            .attr('x', (xScale(d.legalSystem) || 0) + (xScale.bandwidth() / 2))
            .attr('y', (yScale(d.count) || 0) - 10)
            .attr('text-anchor', 'middle')
            .attr('font-size', '12px')
            .attr('font-weight', 'bold')
            .attr('fill', '#fff')
            .text(d.count);
        })
        .on('mouseout', function() {
          d3.select(this).attr('fill', '#4F46E5');
          svg.select('#tooltip').remove();
        });

      // Add value labels on top of bars
      svg.selectAll('.label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'label')
        .attr('x', d => (xScale(d.legalSystem) || 0) + (xScale.bandwidth() / 2))
        .attr('y', d => (yScale(d.count) || 0) - 5)
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .attr('fill', '#374151')
        .text(d => d.count);

      // Add chart title
      svg.append('text')
        .attr('x', chartWidth / 2)
        .attr('y', -20)
        .attr('text-anchor', 'middle')
        .attr('font-size', '16px')
        .attr('font-weight', 'bold')
        .text('Distribution by Legal System');

      // Add grid lines
      svg.append('g')
        .attr('class', 'grid')
        .call((g: d3.Selection<SVGGElement, unknown, null, undefined>) => g.call(d3.axisLeft(yScale).tickSize(-chartWidth)))
        .selectAll('line')
        .attr('stroke', '#E5E7EB')
        .attr('stroke-dasharray', '2,2');

      setLoading(false);
    } catch (err) {
      console.error('Error creating bar chart:', err);
      setError('Failed to create bar chart visualization');
      setLoading(false);
    }
  }, [data, width, height]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 p-4">
        <div className="text-red-700 text-center">
          <h3 className="font-semibold mb-2">Visualization Error</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
};

export default LegalSystemBarChart;