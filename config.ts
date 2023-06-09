let REMS_ADMIN_SERVER_BASE: string;
let REMS_HOOKS_PATH: string;

if (process.env.NODE_ENV === 'production') { // Production URLs
    REMS_ADMIN_SERVER_BASE = 'http://localhost:8090'; // ! Need to change upon creation of production server !
} else { // Development URLs
    REMS_ADMIN_SERVER_BASE = 'http://localhost:8090'; 
    REMS_HOOKS_PATH = '/cds-services/rems-order-sign'; 
}

export { REMS_ADMIN_SERVER_BASE, REMS_HOOKS_PATH };