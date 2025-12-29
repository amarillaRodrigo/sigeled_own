import { useState, Suspense, lazy } from "react";
import { personaService, profileService, roleService, userService } from "../../services/api";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { useDebounce } from "use-debounce";
import { useToast } from "../../components/ToastProvider";
import logoCarga from "../../assets/svg/logoCarga.svg";
import LoadingState from "../../components/LoadingState";
import { motion } from "motion/react";

const UsuariosTable = lazy(() => import('./Usuarios'));

const UsuariosSection = ({user}) =>{
    const queryClient = useQueryClient();
    const [filtros, setFiltros] = useState({ search: '', perfil: '' });
    const [debouncedSearch] = useDebounce(filtros.search, 300);
    const toast = useToast();

    const [togglingId, setTogglingId] = useState(null);

    const queryKey = ['usuarios', 'busqueda', debouncedSearch, filtros.perfil];

    const { data: usuarios = [], isLoading: isLoadingUsuarios } = useQuery({
        queryKey: queryKey,
        queryFn: () => personaService.buscadorAvanzadoUsuarios(debouncedSearch, filtros.perfil).then(res => res.data),
        placeholderData: keepPreviousData,
    });

    const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
        queryKey: ['roles'],
        queryFn: () => roleService.getRoles().then(res => res.data),
    })

    const { data: profiles = [], isLoading: isLoadingProfiles } = useQuery({
        queryKey: ['profiles'],
        queryFn:() => profileService.getProfiles().then(res => res.data)
    });

    const assignRoleMutation = useMutation({
        mutationFn: ({ id_usuario, id_rol }) => roleService.assignRoleToUser(id_usuario, id_rol, user.id),
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: queryKey});
            toast.success("Rol asignado correctamente");
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Error al asignar rol');
        }
    })

    const toggleUserMutation = useMutation({
        mutationFn: (usuario) => userService.toggleUsuario(usuario.id_usuario),

        onMutate: async (usuario) => {
            await queryClient.cancelQueries({ queryKey: queryKey });
            const prev = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (list) =>
                Array.isArray(list)
                    ? list.map(u =>
                        u.id_usuario === usuario.id_usuario
                            ? { ...u, activo: !u.activo }
                            : u
                    )
                    : list
            );

            return { prev };
        },

        onSuccess: (_data, usuario) => {
            const accion = usuario.activo ? 'desactivado' : 'activado';
            const etiqueta = usuario.email || `${usuario.nombre} ${usuario.apellido}` || 'Usuario';
            toast.success(`${etiqueta} fue ${accion} correctamente`);
        },

        onError: (err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
            toast.error(err?.response?.data?.message || 'Error al cambiar el estado del usuario');
        },

        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: queryKey });
        },
    });

    const handleAssignRole = (id_usuario, id_rol) => {
        assignRoleMutation.mutate({id_usuario, id_rol});
    }

    const handleEdit = (usuario) => {
        console.log('Editar usuario', usuario);
    };

    const handleToggle = async (usuario) => {
        toggleUserMutation.mutate(usuario);
    }

    if (isLoadingRoles || isLoadingProfiles) {
        return <LoadingState />
    }

    return (
        <Suspense fallback={<LoadingState/>}>
            <UsuariosTable
                users={usuarios}
                isLoading={isLoadingUsuarios}
                roles = {roles}
                profiles = {profiles}
                onEdit = {handleEdit}
                onToggle = {handleToggle}
                onAssignRole = {handleAssignRole}
                filtros={filtros}
                onFiltroChange={setFiltros}
            />
        </Suspense>
    )
}

export default UsuariosSection