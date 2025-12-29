import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function DonutChart({ items = [], height = 200 }) {
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

    const colors = ["#19F124", "#facc15", "#f97316", "#ef4444", "#64748b"];

    const data = {
        labels,
        datasets: [
            {
                data: values,
                backgroundColor: labels.map(
                    (_l, idx) => colors[idx % colors.length]
                ),
                borderWidth: 0,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
            legend: {
                position: "bottom",
                labels: {
                    color: "#e5e7eb",
                    font: { size: 11 },
                },
            },
            tooltip: {
                callbacks: {
                    label: (ctx) => `${ctx.label}: ${ctx.parsed}`,
                },
            },
        },
    };

    return (
        <div
            style={{ height, width: "100%" }}
            className="max-h-56"
        >
            <Doughnut data={data} options={options} />
        </div>
    );
}
