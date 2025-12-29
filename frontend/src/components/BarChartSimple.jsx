import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function BarChartSimple({ items = [], height = 220 }) {
    const dataItems = (items || []).filter((i) => Number(i.value) > 0);

    if (!dataItems.length) {
        return (
        <p className="text-sm text-gray-400">
            No hay datos suficientes para mostrar el gráfico.
        </p>
        );
    }

    const labels = dataItems.map((i) => i.label || "Sin dato");
    const values = dataItems.map((i) => Number(i.value) || 0);

    const data = {
        labels,
        datasets: [
        {
            label: "Cantidad",
            data: values,
            backgroundColor: "#19F124",
            borderRadius: 6,
        },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
        legend: {
            display: false,
        },
        tooltip: {
            callbacks: {
            label: (ctx) => `${ctx.parsed.y} ítems`,
            },
        },
        },
        scales: {
        x: {
            ticks: { color: "#9fb2c1", font: { size: 11 } },
            grid: { display: false },
        },
        y: {
            ticks: { color: "#9fb2c1", font: { size: 11 } },
            grid: { color: "#1b2a37" },
        },
        },
    };

    return (
        <div style={{ height }}>
        <Bar data={data} options={options} />
        </div>
    );
}
