import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reporteService } from '../../services/api';
import { FiDownload, FiRefreshCw, FiUsers, FiFileText, FiAward, FiCalendar, FiTrendingUp, FiAlertCircle } from 'react-icons/fi';
import BarChartSimple from '../../components/BarChartSimple';
import DonutChart from '../../components/DonutChart';
import LoadingState from '../../components/LoadingState';

const Reportes = () => {
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchDocente, setSearchDocente] = useState('');
    const [selectedDocente, setSelectedDocente] = useState(null);
    const [diasVencimiento, setDiasVencimiento] = useState(30);

    const { data: estadisticasGenerales, isLoading: loadingGenerales, refetch: refetchGenerales } = useQuery({
        queryKey: ['estadisticas-generales'],
        queryFn: async () => {
            const response = await reporteService.getEstadisticasGenerales();
            return response.data.data;
        }
    });

    const { data: estadisticasContratos, isLoading: loadingContratos } = useQuery({
        queryKey: ['estadisticas-contratos', selectedYear],
        queryFn: async () => {
            const response = await reporteService.getEstadisticasContratos(selectedYear);
            return response.data.data;
        }
    });

    const { data: estadisticasTitulos, isLoading: loadingTitulos } = useQuery({
        queryKey: ['estadisticas-titulos'],
        queryFn: async () => {
            const response = await reporteService.getEstadisticasTitulos();
            return response.data.data;
        }
    });

    const { data: rankingAntiguedad, isLoading: loadingRanking } = useQuery({
        queryKey: ['ranking-antiguedad'],
        queryFn: async () => {
            const response = await reporteService.getRankingAntiguedad(10);
            return response.data.data;
        }
    });

    const { data: contratosVencer, isLoading: loadingVencer } = useQuery({
        queryKey: ['contratos-vencer', diasVencimiento],
        queryFn: async () => {
            const response = await reporteService.getContratosProximosVencer(diasVencimiento);
            return response.data.data;
        }
    });

    const { data: listadoDocentes, isLoading: loadingDocentes } = useQuery({
        queryKey: ['listado-docentes', searchDocente],
        queryFn: async () => {
            const response = await reporteService.getListadoDocentes({ search: searchDocente });
            return response.data.data;
        }
    });

    const handleDescargarInforme = async (id_persona, apellido, nombre) => {
        try {
            await reporteService.descargarInformeEscalafonarioPDF(
                id_persona, 
                `informe_${apellido}_${nombre}.pdf`
            );
        } catch (error) {
            console.error('Error al descargar informe:', error);
            alert('Error al descargar el informe');
        }
    };

    const contratoChartData = estadisticasContratos?.map(item => ({
        label: item.periodo,
        value: parseInt(item.total_contratos)
    })) || [];

    const tituloChartData = estadisticasTitulos?.map(item => ({
        label: item.tipo_titulo,
        value: parseInt(item.cantidad)
    })) || [];

    return (
        <div className="min-h-screen bg-[#020c14] text-white p-6 pt-20">
        <div className="mx-auto space-y-6 max-w-7xl">
            <div className="flex flex-col items-start justify-between gap-4 mb-8 sm:flex-row sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold text-[#19F124]">Reportes y Estadísticas</h1>
                    <p className="mt-1 text-gray-400">Análisis completo del sistema SIGELED</p>
                </div>
                <button
                    onClick={() => refetchGenerales()}
                    className="flex items-center cursor-pointer gap-2 px-4 py-2 bg-[#19F124] text-[#020c14] rounded-lg hover:bg-[#3af743] transition-colors whitespace-nowrap text-sm sm:text-base w-full sm:w-auto justify-center"
                >
                    <FiRefreshCw className="w-4 h-4" />
                    Actualizar
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon={<FiUsers />}
                    title="Total Personas"
                    value={estadisticasGenerales?.total_personas || 0}
                    subtitle={`${estadisticasGenerales?.total_profesores || 0} profesores`}
                    loading={loadingGenerales}
                />
                <StatCard
                    icon={<FiFileText />}
                    title="Contratos"
                    value={estadisticasGenerales?.total_contratos || 0}
                    subtitle={`${estadisticasGenerales?.contratos_activos || 0} activos`}
                    loading={loadingGenerales}
                    highlight
                />
                <StatCard
                    icon={<FiAward />}
                    title="Títulos"
                    value={estadisticasGenerales?.total_titulos || 0}
                    subtitle={`${estadisticasGenerales?.titulos_verificados || 0} verificados`}
                    loading={loadingGenerales}
                />
                <StatCard
                    icon={<FiFileText />}
                    title="Documentos"
                    value={estadisticasGenerales?.total_documentos || 0}
                    subtitle={`${estadisticasGenerales?.usuarios_activos || 0} usuarios activos`}
                    loading={loadingGenerales}
                />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="bg-[#101922] rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">Contratos por Período</h2>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="bg-[#020c14] text-white px-3 py-1 rounded border border-gray-600 focus:border-[#19F124] outline-none"
                    >
                        {[2023, 2024, 2025, 2026].map(year => (
                        <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    </div>
                    {loadingContratos ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#19F124]"></div>
                    </div>
                    ) : (
                    <BarChartSimple data={contratoChartData} height={300} />
                    )}
                </div>

                <div className="bg-[#101922] rounded-lg p-6">
                    <h2 className="mb-4 text-xl font-semibold">Títulos por Tipo</h2>
                    {loadingTitulos ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#19F124]"></div>
                    </div>
                    ) : (
                    <DonutChart data={tituloChartData} height={300} />
                    )}
                </div>
            </div>

            <div className="bg-[#101922] rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                    <FiTrendingUp className="text-[#19F124]" />
                    <h2 className="text-xl font-semibold">Top 10 - Docentes por Antigüedad</h2>
                </div>
                {loadingRanking ? (
                    <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#19F124]"></div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                            <tr className="border-b border-gray-700">
                                <th className="px-4 py-3 text-left">#</th>
                                <th className="px-4 py-3 text-left">Docente</th>
                                <th className="px-4 py-3 text-left">DNI</th>
                                <th className="px-4 py-3 text-left">Primer Contrato</th>
                                <th className="px-4 py-3 text-left">Antigüedad</th>
                                <th className="px-4 py-3 text-left">Contratos</th>
                                <th className="px-4 py-3 text-left">Acciones</th>
                            </tr>
                            </thead>
                            <tbody>
                            {rankingAntiguedad?.map((docente, index) => (
                                <tr key={docente.id_persona} className="border-b border-gray-800 hover:bg-[#1a2532] transition-colors">
                                <td className="py-3 px-4 font-bold text-[#19F124]">{index + 1}</td>
                                <td className="px-4 py-3">{docente.apellido}, {docente.nombre}</td>
                                <td className="px-4 py-3">{docente.dni}</td>
                                <td className="px-4 py-3">{new Date(docente.fecha_inicio).toLocaleDateString('es-AR')}</td>
                                <td className="px-4 py-3">
                                    <span className="text-[#19F124] font-semibold">
                                    {docente.antiguedad_anios} años {docente.antiguedad_meses} meses
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    {docente.total_contratos} 
                                    <span className="ml-1 text-gray-400">({docente.contratos_activos} activos)</span>
                                </td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => handleDescargarInforme(docente.id_persona, docente.apellido, docente.nombre)}
                                        className="flex cursor-pointer items-center gap-1 px-3 py-1 bg-[#19F124] text-[#020c14] rounded hover:bg-[#3af743] transition-colors text-sm"
                                    >
                                        <FiDownload className="w-3 h-3" />
                                        PDF
                                    </button>
                                </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="bg-[#101922] rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <FiAlertCircle className="text-yellow-500" />
                        <h2 className="text-xl font-semibold">Contratos Próximos a Vencer</h2>
                    </div>
                    <select
                        value={diasVencimiento}
                        onChange={(e) => setDiasVencimiento(parseInt(e.target.value))}
                        className="bg-[#020c14] text-white px-3 py-1 rounded border border-gray-600 focus:border-[#19F124] outline-none"
                    >
                        <option value={15}>15 días</option>
                        <option value={30}>30 días</option>
                        <option value={60}>60 días</option>
                        <option value={90}>90 días</option>
                    </select>
                </div>
                {loadingVencer ? (
                    <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#19F124]"></div>
                    </div>
                ) : contratosVencer && contratosVencer.length > 0 ? (
                    <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className="px-4 py-3 text-left">Docente</th>
                                <th className="px-4 py-3 text-left">DNI</th>
                                <th className="px-4 py-3 text-left">Período</th>
                                <th className="px-4 py-3 text-left">Vence</th>
                                <th className="px-4 py-3 text-left">Días Restantes</th>
                                <th className="px-4 py-3 text-left">Materias</th>
                            </tr>
                        </thead>
                        <tbody>
                        {contratosVencer.map((contrato) => (
                            <tr key={contrato.id_contrato_profesor} className="border-b border-gray-800 hover:bg-[#1a2532] transition-colors">
                            <td className="px-4 py-3">{contrato.apellido}, {contrato.nombre}</td>
                            <td className="px-4 py-3">{contrato.dni}</td>
                            <td className="px-4 py-3">{contrato.periodo} {contrato.anio}</td>
                            <td className="px-4 py-3">{new Date(contrato.fecha_fin).toLocaleDateString('es-AR')}</td>
                            <td className="px-4 py-3">
                                <span className={`font-semibold ${
                                parseInt(contrato.dias_restantes) <= 15 ? 'text-red-500' : 
                                parseInt(contrato.dias_restantes) <= 30 ? 'text-yellow-500' : 
                                'text-green-500'
                                }`}>
                                {Math.floor(contrato.dias_restantes)} días
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                {contrato.materias?.map((m, i) => (
                                <span key={i} className="text-sm text-gray-400">
                                    {m.descripcion}{i < contrato.materias.length - 1 ? ', ' : ''}
                                </span>
                                ))}
                            </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                ) : (
                    <p className="py-8 text-center text-gray-400">No hay contratos próximos a vencer en los próximos {diasVencimiento} días</p>
                )}
                </div>

                <div className="bg-[#101922] rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <FiFileText className="text-[#19F124]" />
                        <h2 className="text-xl font-semibold">Informes Escalafonarios</h2>
                    </div>
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Buscar docente por nombre, apellido o DNI..."
                            value={searchDocente}
                            onChange={(e) => setSearchDocente(e.target.value)}
                            className="w-full bg-[#020c14] text-white px-4 py-2 rounded border border-gray-600 focus:border-[#19F124] outline-none"
                        />
                    </div>
                    {loadingDocentes ? (
                        <div className="flex items-center justify-center h-32">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#19F124]"></div>
                        </div>
                    ) : listadoDocentes && listadoDocentes.length > 0 ? (
                        <div className="overflow-x-auto max-h-96">
                        <table className="w-full">
                            <thead className="sticky top-0 bg-[#101922]">
                                <tr className="border-b border-gray-700">
                                    <th className="px-4 py-3 text-left">Docente</th>
                                    <th className="px-4 py-3 text-left">DNI</th>
                                    <th className="px-4 py-3 text-left">Email</th>
                                    <th className="px-4 py-3 text-left">Títulos</th>
                                    <th className="px-4 py-3 text-left">Contratos</th>
                                    <th className="px-4 py-3 text-left">Antigüedad</th>
                                    <th className="px-4 py-3 text-left">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listadoDocentes.map((docente) => (
                                    <tr key={docente.id_persona} className="border-b border-gray-800 hover:bg-[#1a2532] transition-colors">
                                    <td className="px-4 py-3">{docente.apellido}, {docente.nombre}</td>
                                    <td className="px-4 py-3">{docente.dni}</td>
                                    <td className="px-4 py-3 text-sm text-gray-400">{docente.email || 'N/A'}</td>
                                    <td className="px-4 py-3 text-center">{docente.total_titulos}</td>
                                    <td className="px-4 py-3 text-center">
                                        {docente.total_contratos} 
                                        <span className="ml-1 text-gray-400">({docente.contratos_activos} activos)</span>
                                    </td>
                                    <td className="px-4 py-3 text-center">{docente.antiguedad_anios || 0} años</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => handleDescargarInforme(docente.id_persona, docente.apellido, docente.nombre)}
                                            className="flex items-center cursor-pointer gap-1 px-3 py-1 bg-[#19F124] text-[#020c14] rounded hover:bg-[#3af743] transition-colors text-sm"
                                        >
                                            <FiDownload className="w-3 h-3" />
                                            Descargar
                                        </button>
                                    </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    ) : (
                        <p className="py-8 text-center text-gray-400">
                        {searchDocente ? 'No se encontraron docentes' : 'Ingrese un término de búsqueda'}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ icon, title, value, subtitle, loading, highlight }) => (
    <div className={`bg-[#101922] rounded-lg p-6 ${highlight ? 'ring-2 ring-[#19F124]' : ''}`}>
        <div className="flex items-center justify-between mb-2">
        <div className={`text-2xl ${highlight ? 'text-[#19F124]' : 'text-gray-400'}`}>
            {icon}
        </div>
        <div className="text-right">
            {loading ? (
            <div className="w-16 h-8">
                <LoadingState/>
            </div>
            ) : (
            <div className={`text-3xl font-bold ${highlight ? 'text-[#19F124]' : 'text-white'}`}>
                {value}
            </div>
            )}
        </div>
        </div>
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-gray-500">{subtitle}</p>}
    </div>
);

export default Reportes;