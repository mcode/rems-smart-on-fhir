let REMS_ADMIN_SERVER_BASE: string;

if (process.env.NODE_ENV === 'production') {
    REMS_ADMIN_SERVER_BASE = 'http://localhost:8090'; // Production URL ! Need to change upon creation of production server !
} else {
    REMS_ADMIN_SERVER_BASE = 'http://localhost:8090'; // Development URL
}

export { REMS_ADMIN_SERVER_BASE };