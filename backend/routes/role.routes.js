import express from 'express';
import { 
    getAllRoles, 
    getRoleById, 
    createRole, 
    updateRole, 
    deleteRole ,
    getRolesByUserId, 
    assignRoleToUser
} from '../models/roleModel.js';
import { verificarToken, permitirRoles, soloRRHH } from '../middleware/authMiddleware.js';
import { validarCrearRol, validarActualizarRol } from '../validators/roleValidator.js';
import { unassignRole } from '../controllers/role.Controller.js';

const roleRouter = express.Router();

// Todas las rutas requieren autenticación y rol de administrador
roleRouter.use(verificarToken);
roleRouter.use(permitirRoles('ADMIN', 'RRHH'));

roleRouter.delete('/usuario/:id_usuario/:id_rol', unassignRole);

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Obtener todos los roles
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de roles
 */
roleRouter.get('/', async (req, res) => {
    try {
        const roles = await getAllRoles();
        res.json(roles);
    } catch (error) {
        console.error('Error al obtener roles:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Obtener rol por ID
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Rol encontrado
 *       404:
 *         description: Rol no encontrado
 */
roleRouter.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const role = await getRoleById(id);
        
        if (!role) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }
        
        res.json(role);
    } catch (error) {
        console.error('Error al obtener rol:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Crear nuevo rol
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rol creado exitosamente
 *       400:
 *         description: Datos inválidos
 *       500:
 *         description: Error del servidor
 */
roleRouter.post('/', validarCrearRol, async (req, res) => {
    try {
        const newRole = await createRole(req.body);
        res.status(201).json({
            message: 'Rol creado exitosamente',
            role: newRole
        });
    } catch (error) {
        console.error('Error al crear rol:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     summary: Actualizar rol
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rol actualizado exitosamente
 *       404:
 *         description: Rol no encontrado
 *       500:
 *         description: Error del servidor
 */
roleRouter.put('/:id', validarActualizarRol, async (req, res) => {
    try {
        const { id } = req.params;
        const updatedRole = await updateRole(id, req.body);
        
        if (!updatedRole) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }
        
        res.json({
            message: 'Rol actualizado exitosamente',
            role: updatedRole
        });
    } catch (error) {
        console.error('Error al actualizar rol:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Eliminar rol
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Rol eliminado exitosamente
 *       404:
 *         description: Rol no encontrado
 *       400:
 *         description: No se puede eliminar rol con usuarios asignados
 *       500:
 *         description: Error del servidor
 */
roleRouter.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedRole = await deleteRole(id);
        
        if (!deletedRole) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }
        
        res.json({
            message: 'Rol eliminado exitosamente',
            role: deletedRole
        });
    } catch (error) {
        console.error('Error al eliminar rol:', error);
        
        if (error.message.includes('usuarios asignados')) {
            return res.status(400).json({ message: error.message });
        }
        
        res.status(500).json({ message: 'Error del servidor' });
    }
});

/**
 * @swagger
 * /api/roles/usuario/{id_usuario}:
 *   get:
 *     summary: Obtener roles de un usuario
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id_usuario
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de roles del usuario
 *       500:
 *         description: Error del servidor
 */
roleRouter.get('/usuario/:id_usuario', async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const roles = await getRolesByUserId(id_usuario);
        res.json(roles);
    } catch (error) {
        console.error('Error al obtener roles de usuario:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

/**
 * @swagger
 * /api/roles/usuario/asignar:
 *   post:
 *     summary: Asignar rol a usuario
 *     tags:
 *       - Roles
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id_usuario:
 *                 type: integer
 *               id_rol:
 *                 type: integer
 *               asignado_por:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Rol asignado exitosamente
 *       500:
 *         description: Error del servidor
 */
roleRouter.post('/usuario/asignar', async (req, res) => {
    try {
        const { id_usuario, id_rol, asignado_por } = req.body;
        const result = await assignRoleToUser(id_usuario, id_rol, asignado_por);
        res.status(201).json(result);
    } catch (error) {
        console.error('Error al asignar rol:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

export default roleRouter;