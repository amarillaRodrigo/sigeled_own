import { useMemo, useState, useEffect } from 'react';
import {
    useReactTable,
    createColumnHelper,
    getCoreRowModel,
    flexRender,
    getPaginationRowModel,
} from "@tanstack/react-table";
import { MdNavigateNext, MdNavigateBefore } from "react-icons/md";
import { FaToggleOn, FaToggleOff } from "react-icons/fa6";
import { FiSearch } from "react-icons/fi";
import { CgInfo } from "react-icons/cg";
import { useNavigate } from 'react-router-dom';
import { motion } from "motion/react";

const columnHelper = createColumnHelper();

export default function Usuarios({
    users = [],
    onEdit,
    onToggle,
    roles = [],
    profiles = [],
    onAssignRole,
    isLoading,
    filtros,
    onFiltroChange,
}) {
    const [pagination, setPagination] = useState({
        pageIndex: 0,
        pageSize: 10,
    });
    const navigate = useNavigate();

    useEffect(() => {
        setPagination((prev) => ({
            ...prev,
            pageIndex: 0,
        }));
    }, [users]);

    const handleFiltro = (e) => {
        const { name, value } = e.target;
        onFiltroChange((prev) => ({ ...prev, [name]: value }));
    };

    const columns = useMemo(
        () => [
            columnHelper.accessor("nombre", { header: "Nombre" }),
            columnHelper.accessor("apellido", { header: "Apellido" }),
            columnHelper.accessor("email", { header: "Email" }),
            columnHelper.accessor("perfilesasignados", {
                header: "Categoría",
                cell: ({ getValue }) =>
                    (getValue() || []).map((p) => p.nombre).join(", ") ||
                    "Sin asignar",
            }),
            columnHelper.accessor("rolesasignados", {
                header: "Rol (Sistema)",
                cell: ({ getValue }) =>
                    (getValue() || []).map((r) => r.nombre).join(", ") ||
                    "Sin asignar",
            }),
            columnHelper.display({
                id: "info",
                header: "Info.",
                cell: ({ row }) => (
                    <div className="flex items-center justify-center align-middle">
                        <button
                            onClick={() =>
                                navigate(
                                    `/dashboard/usuarios/${row.original.id_usuario}`
                                )
                            }
                            aria-label={`Ver info ${row.original.nombre}`}
                            className="p-1 rounded-[0.80rem] bg-[#242E38] hover:bg-[#16222b] transition cursor-pointer"
                        >
                            <CgInfo className="w-8 h-8 text-[#19F124]" />
                        </button>
                    </div>
                ),
            }),
            columnHelper.display({
                id: "actions",
                header: "Activar/Desactivar",
                cell: ({ row }) => (
                    <div className="flex items-center justify-center align-middle">
                        {onToggle && (
                            <button
                                onClick={() => onToggle(row.original)}
                                aria-label={`${
                                    row.original.activo
                                        ? "Desactivar"
                                        : "Activar"
                                } ${row.original.nombre}`}
                                className={`px-3 py-1 rounded-2xl transition-all duration-200 cursor-pointer
                                    ${
                                        row.original.activo
                                            ? "font-black text-[#19F124] hover:bg-[#2d3946]"
                                            : "font-black text-[#ff2222] hover:text-[#ff3e3e] hover:bg-[#2d3946]"
                                    }
                                `}
                            >
                                {row.original.activo ? (
                                    <FaToggleOn className="w-7 h-7" />
                                ) : (
                                    <FaToggleOff className="w-7 h-7" />
                                )}
                            </button>
                        )}
                    </div>
                ),
            }),
        ],
        [onToggle, navigate]
    );

    const table = useReactTable({
        data: users,
        columns,
        state: { pagination },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
    });

    const pageCount = table.getPageCount();
    const currentPage =
        pageCount === 0 ? 0 : table.getState().pagination.pageIndex + 1;

    return (
        <motion.main
            className="mt-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
        >
            <motion.h1
                className="text-4xl font-medium ml-11"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
            >
                Gestión de Usuarios
            </motion.h1>

            <motion.div
                className="flex gap-4 px-10 mt-5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.05 }}
            >
                <div className="flex-1">
                    <label htmlFor="search" className="sr-only">
                        Buscar usuario
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            name="search"
                            id="search"
                            value={filtros.search}
                            onChange={handleFiltro}
                            placeholder="Buscar por nombre, apellido, DNI o email..."
                            className="w-full h-12 px-5 pl-12 rounded-xl bg-[#101922] text-white placeholder-white/50 text-lg leading-none outline-none focus:ring-2 focus:ring-[#19F124]/60"
                        />
                        <FiSearch
                            className="absolute -translate-y-1/2 text-white/50 left-4 top-1/2"
                            size={20}
                        />
                    </div>
                </div>

                <div className="w-1/4">
                    <label htmlFor="perfil" className="sr-only">
                        Categoría
                    </label>
                    <select
                        name="perfil"
                        id="perfil"
                        value={filtros.perfil}
                        onChange={handleFiltro}
                        className="w-full h-12 px-5 rounded-xl bg-[#101922] text-white text-lg leading-none outline-none focus:ring-2 focus:ring-[#19F124]/60"
                    >
                        <option value="">Todas las Categorías</option>
                        {profiles.map((p) => (
                            <option key={p.id_perfil} value={p.nombre}>
                                {p.nombre}
                            </option>
                        ))}
                    </select>
                </div>
            </motion.div>

            <motion.div
                className="pl-10 pr-10 mt-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
            >
                <motion.div
                    className="flex flex-col justify-between h-[75vh] bg-[#101922] rounded-3xl overflow-hidden"
                    layout
                >
                    <div className="overflow-y-auto grow">
                        <table className="min-w-full">
                            <thead className="sticky top-0 border-b border-b-gray-700 bg-[#101922]">
                                {table.getHeaderGroups().map((hg) => (
                                    <tr key={hg.id}>
                                        {hg.headers.map((h) => (
                                            <th
                                                key={h.id}
                                                scope="col"
                                                className="px-6 py-4 text-xl text-white"
                                            >
                                                {h.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        h.column.columnDef
                                                            .header,
                                                        h.getContext()
                                                    )}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>

                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td
                                            colSpan={columns.length}
                                            className="p-8 text-center text-white/70"
                                        >
                                            Cargando usuarios...
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={columns.length}
                                            className="p-8 text-center text-white/70"
                                        >
                                            No se encontraron usuarios con esos
                                            filtros.
                                        </td>
                                    </tr>
                                ) : (
                                    table
                                        .getRowModel()
                                        .rows.map((row) => (
                                            <motion.tr
                                                key={row.id}
                                                className="text-xl"
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{
                                                    opacity: 1,
                                                    y: 0,
                                                }}
                                                transition={{ duration: 0.2 }}
                                            >
                                                {row
                                                    .getVisibleCells()
                                                    .map((cell) => (
                                                        <td
                                                            key={cell.id}
                                                            className="px-6 py-[0.55rem]"
                                                        >
                                                            {flexRender(
                                                                cell.column
                                                                    .columnDef
                                                                    .cell,
                                                                cell.getContext()
                                                            )}
                                                        </td>
                                                    ))}
                                            </motion.tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <motion.div
                        className="flex items-center justify-between py-2 mt-auto align-middle border-t border-t-gray-700"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <div />

                        <div className="flex items-center justify-center gap-2 pr-3 text-center">
                            Pág: {currentPage} - {pageCount}
                            <motion.button
                                onClick={() => table.previousPage()}
                                disabled={!table.getCanPreviousPage()}
                                whileTap={{ scale: 0.95 }}
                                whileHover={
                                    table.getCanPreviousPage()
                                        ? { y: -1 }
                                        : {}
                                }
                                className={`
                                    p-1 border-2 border-[#19F124] rounded-full
                                    hover:bg-[#19F124] hover:text-[#101922]
                                    cursor-pointer transition
                                    disabled:cursor-default disabled:opacity-50
                                    disabled:hover:bg-transparent disabled:hover:text-[#19F124]
                                `}
                            >
                                <MdNavigateBefore
                                    className={`
                                        w-9 h-9 -m-1
                                        text-[#19F124]
                                        transition
                                        ${
                                            !table.getCanPreviousPage()
                                                ? "opacity-100"
                                                : "hover:text-[#101922]"
                                        }
                                    `}
                                />
                            </motion.button>

                            <motion.button
                                onClick={() => table.nextPage()}
                                disabled={!table.getCanNextPage()}
                                whileTap={{ scale: 0.95 }}
                                whileHover={
                                    table.getCanNextPage()
                                        ? { y: -1 }
                                        : {}
                                }
                                className={`
                                    p-1 border-2 border-[#19F124] rounded-full
                                    hover:bg-[#19F124] hover:text-[#101922]
                                    cursor-pointer transition
                                    disabled:cursor-default disabled:opacity-50
                                    disabled:hover:bg-transparent disabled:hover:text-[#19F124]
                                `}
                            >
                                <MdNavigateNext
                                    className={`
                                        w-9 h-9 -m-1
                                        text-[#19F124]
                                        transition
                                        ${
                                            !table.getCanNextPage()
                                                ? "opacity-100"
                                                : "hover:text-[#101922]"
                                        }
                                    `}
                                />
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            </motion.div>
        </motion.main>
    );
}
