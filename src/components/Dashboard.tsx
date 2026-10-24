import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { distribution } from "../lib/research";
import type { Merchant } from "../lib/types";
export default function Dashboard({ merchants }: { merchants: Merchant[] }) {
  const dist = distribution(merchants, "provider");
  const cats = distribution(merchants, "category");
  const areas = distribution(merchants, "neighborhood");
  const statuses = distribution(merchants, "verification_status");
  return (
    <div className="dashboard">
      <div className="chart-card">
        <div className="panel-title">
          <h3>Provider distribution</h3>
          <span className="tiny">LOCATIONS</span>
        </div>
        <p className="muted small">
          Unknown providers remain in the denominator.
        </p>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dist}
              layout="vertical"
              margin={{ left: 15, right: 20, bottom: 5, top: 10 }}
            >
              <CartesianGrid horizontal={false} stroke="#eeece7" />
              <XAxis
                type="number"
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={95}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12 }}
              />
              <Tooltip cursor={{ fill: "#f6f4ef" }} />
              <Bar
                dataKey="value"
                name="Locations"
                radius={[0, 4, 4, 0]}
                barSize={21}
              >
                {dist.map((d) => (
                  <Cell key={d.name} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="chart-card">
        <h3>Verification coverage</h3>
        <p className="muted small">Confidence in the current POS observation</p>
        <div className="donut">
          <ResponsiveContainer width="100%" height={225}>
            <PieChart>
              <Pie
                data={statuses}
                dataKey="value"
                nameKey="name"
                innerRadius={66}
                outerRadius={86}
                paddingAngle={4}
              >
                {statuses.map((d) => (
                  <Cell
                    key={d.name}
                    fill={
                      d.name === "Verified"
                        ? "#688c76"
                        : d.name === "Inferred"
                          ? "#e1ad50"
                          : "#b9bcb4"
                    }
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-label">
            <strong>
              {merchants.length
                ? Math.round(
                    (merchants.filter(
                      (m) => m.verification_status === "Verified",
                    ).length /
                      merchants.length) *
                      100,
                  )
                : 0}
              %
            </strong>
            <span>verified</span>
          </div>
        </div>
        <div className="status-legend">
          {statuses.map((s) => (
            <span key={s.name}>
              {s.name} <b>{s.value}</b>
            </span>
          ))}
        </div>
      </div>
      <div className="chart-card">
        <h3>Merchant categories</h3>
        <p className="muted small">Composition of the sampled businesses</p>
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={cats}
              margin={{ top: 20, right: 15, left: -20, bottom: 45 }}
            >
              <CartesianGrid vertical={false} stroke="#eeece7" />
              <XAxis
                dataKey="name"
                angle={-25}
                textAnchor="end"
                interval={0}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: "#f6f4ef" }} />
              <Bar
                dataKey="value"
                name="Locations"
                fill="#819a86"
                radius={[4, 4, 0, 0]}
                barSize={35}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="chart-card">
        <h3>Geographic coverage</h3>
        <p className="muted small">
          Locations by neighborhood in this selection
        </p>
        <div className="area-list">
          {areas.map((a, i) => (
            <div key={a.name}>
              <span className="rank">0{i + 1}</span>
              <div>
                <b>{a.name}</b>
                <div className="bar-track">
                  <i
                    style={{
                      width: `${(a.value / Math.max(merchants.length, 1)) * 100}%`,
                      background: "#e57b4a",
                    }}
                  />
                </div>
              </div>
              <strong>{a.value}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="research-note">
        <b>Read the sample, not the city.</b>
        <span>
          This is a convenience sample of physical merchants. Location counts
          represent sampled businesses, not transaction volume, revenue, or
          population-adjusted market share. Each location is counted once using
          its latest dated observation.
        </span>
      </div>
    </div>
  );
}
