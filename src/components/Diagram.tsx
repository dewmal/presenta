import { useMemo } from "react";

interface DiagramNode { id: string; label: string; x: number; y: number; tone?: string; color?: string; textColor?: string }
interface DiagramData { type?: string; nodes: DiagramNode[]; edges?: Array<[string, string]>; background?: string }

export function Diagram({ source }: { source: string }) {
  const data = useMemo<DiagramData | null>(() => {
    try {
      const parsed = JSON.parse(source.trim()) as DiagramData;
      return Array.isArray(parsed.nodes) ? parsed : null;
    } catch (error) {
      console.warn("Could not parse presentation diagram:", error);
      return null;
    }
  }, [source]);
  if (!data) return null;
  const nodes = new Map(data.nodes.map((node) => [node.id, node]));
  return <div className="presentation-diagram" role="img" aria-label="Animated presentation diagram" style={data.background ? { backgroundColor: data.background } : undefined}>
    <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <g className="diagram-edges">
        {(data.edges ?? []).map(([from, to]) => {
          const start = nodes.get(from); const end = nodes.get(to);
          return start && end ? <line key={`${from}-${to}`} data-diagram-edge={`${from}-${to}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} /> : null;
        })}
      </g>
      <g className="diagram-nodes">
        {data.nodes.map((node) => <g key={node.id} data-diagram-node={node.id} transform={`translate(${node.x} ${node.y})`}>
          <g className="diagram-node-body">
            <rect className="diagram-node-shape" x={-Math.max(7, node.label.length * 1.55)} y="-7" width={Math.max(14, node.label.length * 3.1)} height="14" rx="7" data-node-tone={node.tone ?? "default"} style={node.color ? { fill: node.color } : undefined} />
            <text textAnchor="middle" dy="1.4" style={node.textColor ? { fill: node.textColor } : undefined}>{node.label}</text>
          </g>
        </g>)}
      </g>
    </svg>
  </div>;
}
