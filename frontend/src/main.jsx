import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

import './styles/colors.css'
import './styles/base.css'
import './styles/header.css'
import './styles/header_dropdown.css'
import './styles/category_tabs.css'
import './styles/anime_table.css'
import './styles/add_anime.css'
import './styles/add_category.css'
import './styles/fab.css'
import './styles/search.css'
import './styles/share_modal.css'
import './styles/import_export.css'
import './styles/shared_list.css'
import './styles/toast.css'
import './styles/base_accounts.css'
import './styles/login.css'
import './styles/settings.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
