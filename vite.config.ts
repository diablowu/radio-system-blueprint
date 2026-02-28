import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/radio-system-blueprint/',
    server: {
        allowedHosts: [
            'localhost',
            '127.0.0.1',
            'kad66f99.natappfree.cc'
        ]
    }
})
