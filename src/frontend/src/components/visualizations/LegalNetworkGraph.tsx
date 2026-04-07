'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { VisualizationProps } from '../../types/visualization';

interface LegalNetworkGraphProps extends VisualizationProps {
  width?: number;
  height?: number;
}

const LegalNetworkGraph = ({ data, width = 800, height = 600 }: LegalNetworkGraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeGraph = async () => {
      // Validate data first - check if it's NetworkData (has nodes and links)
      if (!data || !('nodes' in data) || !('links' in data) || !Array.isArray(data.nodes) || !Array.isArray(data.links)) {
        setError('Invalid data format for network graph');
        setLoading(false);
        return;
      }

      try {
        // Clear previous graph
        d3.select(svgRef.current).selectAll('*').remove();

        // Create SVG
        const svg = d3.select(svgRef.current)
          .attr('width', width)
          .attr('height', height)
          .attr('viewBox', [0, 0, width, height]);

        // Create simulation
        const simulation = d3.forceSimulation(data.nodes)
          .force('link', d3.forceLink(data.links).id((d: any) => d.id).distance(100))
          .force('charge', d3.forceManyBody().strength(-200))
          .force('center', d3.forceCenter(width / 2, height / 2))
          .force('collision', d3.forceCollide().radius(30));

        // Drag functions
        const dragstarted = (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        };

        const dragged = (event: any, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        };

        const dragended = (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        };

        // Add links
        const link = svg.append('g')
          .selectAll('line')
          .data(data.links)
          .enter().append('line')
          .attr('stroke', '#999')
          .attr('stroke-opacity', 0.6)
          .attr('stroke-width', d => Math.sqrt(d.value || 1));

        // Add nodes
        const node = svg.append('g')
          .selectAll('g')
          .data(data.nodes)
          .enter().append('g')
          .call((d3.drag() as any)
            .on('start', dragstarted)
            .on('drag', dragged)
            .on('end', dragended));

        // Node circles
        node.append('circle')
          .attr('r', 10)
          .attr('fill', d => {
            const colors = {
              'constitution': '#4F46E5',
              'case_law': '#10B981',
              'treaty': '#F59E0B',
              'court': '#EF4444',
              'default': '#6B7280'
            };
            return colors[d.type] || colors.default;
          })
          .attr('stroke', '#fff')
          .attr('stroke-width', 2);

        // Node labels
        node.append('text')
          .text(d => d.id.substring(0, 15))
          .attr('x', 15)
          .attr('y', 3)
          .attr('font-size', '12px')
          .attr('fill', '#374151');

        // Tooltip
        node.append('title')
          .text(d => `${d.id}\nType: ${d.type}\n${d.description || ''}`);

        // Simulation events
        simulation.on('tick', () => {
          (link as any)
            .attr('x1', (d: any) => d.source.x)
            .attr('y1', (d: any) => d.source.y)
            .attr('x2', (d: any) => d.target.x)
            .attr('y2', (d: any) => d.target.y);

          (node as any)
            .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
        });

        // Add legend
        const legendData = [
          { type: 'constitution', color: '#4F46E5', label: 'Constitutions' },
          { type: 'case_law', color: '#10B981', label: 'Case Law' },
          { type: 'treaty', color: '#F59E0B', label: 'Treaties' },
          { type: 'court', color: '#EF4444', label: 'Courts' }
        ];

        const legend = svg.append('g')
          .attr('transform', `translate(${width - 150}, 20)`);

        legendData.forEach((item, i) => {
          const legendItem = legend.append('g')
            .attr('transform', `translate(0, ${i * 25})`);

          legendItem.append('circle')
            .attr('r', 8)
            .attr('fill', item.color)
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

          legendItem.append('text')
            .text(item.label)
            .attr('x', 18)
            .attr('y', 4)
            .attr('font-size', '12px')
            .attr('fill', '#374151');
        });

        setLoading(false);
      } catch (err) {
        console.error('Error creating network graph:', err);
        setError('Failed to create network visualization');
        setLoading(false);
      }
    };
    
    initializeGraph();
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

export default LegalNetworkGraph;