import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import db from '../models/db.js';
import { getRoleByName } from '../models/roleModel.js';

// Script para crear el administrador inicial
async function createInitialAdmin() {
    try {
        console.log('🔧 Creando administrador inicial...');

        // Verificar si ya existe un administrador
        const existingAdmin = await db.query(
            `SELECT u.*, r.nombre AS nombre_rol
            FROM usuarios u
            JOIN roles r ON u.rol = r.id
            WHERE r.nombre = 'administrador'`
        );

        if (existingAdmin.rows.length > 0) {
            console.log('⚠️  Ya existe un administrador en el sistema');
            console.log('Administradores existentes:');
            existingAdmin.rows.forEach(admin => {
                console.log(`- ${admin.nombre} (${admin.email})`);
            });
            return;
        }

        // Obtener el rol de administrador
        const adminRole = await getRoleByName('administrador');
        if (!adminRole) {
            console.error('❌ Error: No se encontró el rol "administrador"');
            console.log('💡 Ejecuta primero el script de roles: database/roles.sql');
            return;
        }

        // Datos del administrador inicial (Monjes)
        const adminData = {
            nombre: 'Monjes',
            email: 'admin@sigeled.com',
            contraseña: 'Admin123!', // Cambiar en producción
            rol: adminRole.id,
            dni: '12345678',
            cuil: '20-12345678-9',
            domicilio: 'Dirección del administrador',
            titulo: 'Administrador del Sistema'
        };

        // Hash de la contraseña
        const contraseñaHash = bcrypt.hashSync(adminData.contraseña, 10);

        // Crear el administrador
        const newAdmin = await db.query(
            `INSERT INTO usuarios (nombre, email, contraseña, rol, dni, cuil, domicilio, titulo) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [
                adminData.nombre,
                adminData.email,
                contraseñaHash,
                adminData.rol,
                adminData.dni,
                adminData.cuil,
                adminData.domicilio,
                adminData.titulo
            ]
        );

        console.log('✅ Administrador creado exitosamente!');
        console.log('📋 Datos del administrador:');
        console.log(`   Nombre: ${newAdmin.rows[0].nombre}`);
        console.log(`   Email: ${newAdmin.rows[0].email}`);
        console.log(`   Contraseña: ${adminData.contraseña}`);
        console.log(`   Rol: ${adminRole.nombre}`);
        console.log('');
        console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer inicio de sesión!');

    } catch (error) {
        console.error('❌ Error al crear administrador:', error);
    } finally {
        await db.end();
    }
}

// Ejecutar el script
createInitialAdmin(); 