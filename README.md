# DocScribe - PDF Annotation Client

A modern, feature-rich PDF annotation application built with React and TypeScript. This application allows users to view, annotate, and collaborate on PDF documents with role-based access control.

### Installation

  **Clone the repository**
   ```bash
   git clone https://github.com/Docscribe-app/docscribe-client.git
   cd docscribe-client
   ```

  **Install dependencies**
   ```bash
   npm install
   ```

  **Configure API endpoint**
   
   Update the base URL in .env:
   ```typescript
   VITE_API_URL = http://your-api-url
   ```

  **Run development server**
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:5173`

  **Build for production**
   ```bash
   npm run build
   ```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build production-ready application |
| `npm run lint` | Run ESLint for code quality checks |
| `npm run preview` | Preview production build locally |

---

## Technology Stack

### Core Technologies
- **React** - Modern JavaScript library with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript superset
- **Vite** - Fast build tool and dev server
- **Node.js** - JavaScript runtime environment

### Key Libraries
- **React Router** - Client-side routing and navigation
- **react-pdf** - PDF.js wrapper for React
- **pdfjs-lib** - PDF rendering engine
- **Axios** - HTTP client for API communication
- **Redux Toolkit** - State management
- **Tailwind CSS** - Utility-first CSS framework
- **React Icons** - Icon library
- **Socket.io Client** - Real-time communication
- **PostCSS** - CSS transformation tool
- **Autoprefixer** - CSS vendor prefixing

---

## Folder Structure

```
annotation-client/
├── public/                      # Static assets
├── src/
│   ├── annotation/              # Annotation components
│   │   └── SimpleAnnotationProvider.tsx  # Main PDF viewer with annotation logic
│   │
│   ├── api/                     # API layer
│   │   ├── http.ts             # Axios instance and configuration
│   │   └── serverApi.ts        # API endpoint functions
│   │
│   ├── assets/                  # Images, fonts, etc.
│   │
│   ├── components/              # Reusable components
│   │   ├── AnnotationOverlay.tsx    # SVG annotation overlay
│   │   ├── DocumentList.tsx         # Document listing with search
│   │   ├── UploadForm.tsx           # Drag-and-drop file upload
│   │   └── UserSwitcher.tsx         # User role switcher
│   │
│   ├── context/                 # React Context providers
│   │   └── UserContext.tsx     # User state management
│   │
│   ├── pages/                   # Page components
│   │   ├── DocumentsPage.tsx   # Document list page
│   │   └── ViewerPage.tsx      # PDF viewer page
│   │
│   ├── types/                   # TypeScript type definitions
│   │   └── types.ts            # Shared types
│   │
│   ├── utils/                   # Utility functions
│   │
│   ├── App.tsx                  # Main app component with routing
│   ├── main.tsx                 # Application entry point
│   └── index.css                # Global styles and Tailwind imports
│
├── index.html                   # HTML template
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── tailwind.config.js           # Tailwind CSS configuration
├── vite.config.ts               # Vite build configuration
└── README.md                    # This file
```

### Key Directories

- **`annotation/`**: Contains the core PDF annotation functionality with drawing, highlighting, and shape tools
- **`api/`**: Centralized API communication layer with typed endpoints
- **`components/`**: Reusable UI components used across multiple pages
- **`context/`**: React Context for global state (user authentication, roles)
- **`pages/`**: Top-level page components corresponding to routes
- **`types/`**: Shared TypeScript interfaces and types

---

## 🔌 API Endpoints

The application communicates with a backend server for document and annotation management.

### Base Configuration
```typescript
// src/api/http.ts
import axios from 'axios';

export const http = axios.create({
  baseURL: process.env.VITE_API_URL || 'http://localhost:3000'
});
```

### Document Endpoints

#### List Documents
```typescript
GET /api/documents
Headers: { userId, userName, userRole }
Response: ServerDocMeta[]
```

#### Upload Documents
```typescript
POST /api/documents
Headers: { userId, userName, userRole }
Body: FormData (files)
Response: ServerDocMeta[]
```

#### Get Document File
```typescript
GET /api/documents/:docId/file
Response: PDF file stream
```

#### Delete Document
```typescript
DELETE /api/documents/:docId
Headers: { userId, userName, userRole }
Response: { status: 200 }
```

### Annotation Endpoints

#### List Annotations
```typescript
GET /api/annotations/document/:docId
Headers: { userId, userName, userRole }
Response: ServerAnnotation[]
```

#### Create Annotation
```typescript
POST /api/annotations/document/:docId
Headers: { userId, userName, userRole }
Body: {
  page: number,
  kind: 'point' | 'highlight' | 'freehand' | 'shape',
  note?: string,
  visibility: 'all' | string[],
  rect?: { x, y, w, h },
  path?: { x, y }[],
  shape?: 'rect' | 'ellipse',
  color?: string,
  creatorId: string
}
Response: ServerAnnotation
```

#### Update Annotation
```typescript
PATCH /api/annotations/:id
Headers: { userId, userName, userRole }
Body: Partial<ServerAnnotation>
Response: ServerAnnotation
```

#### Delete Annotation
```typescript
DELETE /api/annotations/:id
Headers: { userId, userName, userRole }
Response: { ok: boolean }
```

### Types

```typescript
interface ServerDocMeta {
  _id: string;
  fileId: string;
  name: string;
  uploaderId: string;
  uploadDate: string;
  fileSize?: number;
}

interface ServerAnnotation {
  _id: string;
  docId: string;
  page: number;
  kind?: 'point' | 'highlight' | 'freehand' | 'shape';
  x?: number;
  y?: number;
  note: string;
  creatorId: string;
  visibility: 'all' | string[];
  createdAt: string;
  rect?: { x: number; y: number; w: number; h: number };
  path?: { x: number; y: number }[];
  shape?: 'rect' | 'ellipse';
  color?: string;
}
```

---

## 🎨 Annotation Logic

### Annotation System Architecture

The annotation system uses an **SVG overlay** positioned above the PDF canvas to enable vector-based annotations that scale with zoom levels.

### Annotation Types

#### 1. **Freehand Drawing**
- User draws free-form paths on the PDF
- Captured as array of coordinate points
- Rendered as SVG `<path>` elements
- Validation: Minimum 3 points required

```typescript
interface FreehandAnnotation {
  kind: 'freehand';
  path: { x: number; y: number }[];  // Percentage-based coordinates
  color: string;
  page: number;
}
```

#### 2. **Rectangle Shape**
- Click and drag to create rectangular annotations
- Stores position and dimensions
- Rendered as SVG `<rect>` elements
- Validation: Minimum 1px distance from start point

```typescript
interface RectangleAnnotation {
  kind: 'shape';
  shape: 'rect';
  rect: { x: number; y: number; w: number; h: number };
  color: string;
  page: number;
}
```

#### 3. **Circle Shape**
- Click and drag to create circular annotations
- Radius calculated from drag distance
- Rendered as SVG `<ellipse>` elements

```typescript
interface CircleAnnotation {
  kind: 'shape';
  shape: 'ellipse';
  rect: { x: number; y: number; w: number; h: number };
  color: string;
  page: number;
}
```

#### 4. **Text Highlighting**
- Select text in PDF to highlight
- Uses `pointer-events: none` on text layer for selection
- Semi-transparent overlay with configurable color

```typescript
interface HighlightAnnotation {
  kind: 'highlight';
  rect: { x: number; y: number; w: number; h: number };
  color: string;
  page: number;
}
```

### Drawing Flow

```
1. User selects tool (highlight, draw, rectangle, circle)
   ↓
2. User interacts with PDF canvas
   ↓
3. Mouse events captured (onMouseDown, onMouseMove, onMouseUp)
   ↓
4. Coordinates normalized to percentages (0-100)
   ↓
5. Preview rendered in real-time
   ↓
6. On mouse up, annotation validated and saved
   ↓
7. API call creates annotation in backend
   ↓
8. Local state updated with new annotation
   ↓
9. SVG overlay re-renders with new annotation
```

### Coordinate System

All annotations use **percentage-based coordinates** (0-100) to remain resolution-independent:

```typescript
// Convert pixel coordinates to percentages
const percentX = (pixelX / canvasWidth) * 100;
const percentY = (pixelY / canvasHeight) * 100;

// Convert back for rendering
const renderX = (percentX / 100) * currentWidth;
const renderY = (percentY / 100) * currentHeight;
```

### Performance Optimizations

1. **React.memo**: Page components memoized to prevent unnecessary rerenders
2. **ResizeObserver Debouncing**: 50ms debounce on resize events
3. **useCallback**: Event handlers memoized
4. **useMemo**: Filtered annotations cached per page
5. **SVG Rendering**: Hardware-accelerated vector graphics

### Annotation State Management

```typescript
const [annotations, setAnnotations] = useState<Annotation[]>([]);
const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
const [currentTool, setCurrentTool] = useState<Tool>('highlight');
const [currentColor, setCurrentColor] = useState('#FFEB3B');
const [isDrawing, setIsDrawing] = useState(false);
const [drawPath, setDrawPath] = useState<{ x: number; y: number }[]>([]);
```

### Comment System

Each annotation can have multiple comments:

```typescript
interface Comment {
  _id: string;
  author: string;
  text: string;
  timestamp: string;
}

// Comments stored per annotation ID
const [comments, setComments] = useState<Record<string, Comment[]>>({});
```

Comments are loaded automatically when annotations are fetched and displayed in a modal when an annotation is selected.

---

## 👥 User Roles & Permissions

### Role Types

| Role | ID | Permissions |
|------|-----|------------|
| **Admin** | A1 | Full access - create, edit, delete all annotations and documents |
| **Default User 1** | D1 | Create annotations, delete own annotations, add comments |
| **Default User 2** | D2 | Create annotations, delete own annotations, add comments |
| **Read-Only** | R1 | View annotations only, cannot create/edit/delete |

### Permission Matrix

| Action | A1 (Admin) | D1/D2 (Users) | R1 (Read-Only) |
|--------|------------|---------------|----------------|
| Upload documents | ✅ | ❌ | ❌ |
| Delete any document | ✅ | ❌ | ❌ |
| View documents | ✅ | ✅ | ✅ |
| Create annotations | ✅ | ✅ | ❌ |
| Delete own annotations | ✅ | ✅ | ❌ |
| Delete any annotation | ✅ | ❌ | ❌ |
| Add comments | ✅ | ✅ | ❌ |
| Delete own comments | ✅ | ✅ | ❌ |
| Delete any comment | ✅ | ❌ | ❌ |

### Implementation

```typescript
// User Context
const defaultUsers: User[] = [
  { id: "A1", name: "Admin (A1)", role: "A1" },
  { id: "D1", name: "Default user 1 (D1)", role: "D1" },
  { id: "D2", name: "Default user 2 (D2)", role: "D2" },
  { id: "R1", name: "Read-only (R1)", role: "R1" },
];

// Permission check examples
const canUpload = current.role === "A1";
const canEdit = current.role !== "R1";
const canDelete = current.role === "A1" || annotation.creatorId === current.id;
```

### Visibility Controls

Annotations can be made visible to:
- **Everyone**: All users can see the annotation
- **A1 only**: Only admins can see
- **D1 only**: Only D1 users can see
- **D2 only**: Only D2 users can see
- **Only Me**: Only the creator can see (for A1, D1, D2 users)

## Component Architecture

### Main Components

#### 1. **SimpleAnnotationProvider** (`annotation/`)
- **Purpose**: Core PDF viewer with full annotation functionality
- **Key Features**:
  - PDF rendering with react-pdf
  - SVG overlay for annotations
  - Drawing tools (highlight, freehand, shapes)
  - Zoom controls
  - Comment system
  - Mobile-responsive toolbar
  - Collapsible annotation panel

#### 2. **DocumentList** (`components/`)
- **Purpose**: Display and manage document list
- **Features**:
  - Search functionality (name, uploader, date)
  - Sortable columns
  - Dual layout (desktop table, mobile cards)
  - Delete documents (admin only)
- **Responsive**: Switches between table and card layout at `md` breakpoint

#### 3. **UploadForm** (`components/`)
- **Purpose**: Upload PDF documents
- **Features**:
  - Drag-and-drop support
  - Multi-file selection
  - File validation (PDF only)
  - Individual file removal
  - Auto-clear on upload failure
- **Permissions**: Only visible to A1 (admin) users

#### 4. **UserSwitcher** (`components/`)
- **Purpose**: Switch between user roles for testing
- **Features**:
  - Dropdown with all available users
  - Visual role indication
  - Responsive design

#### 5. **ViewerPage** (`pages/`)
- **Purpose**: PDF viewer page wrapper
- **Features**:
  - Document metadata display
  - Back navigation
  - User switcher integration
  - Responsive layout
- **Route**: `/viewer/:docId`

#### 6. **DocumentsPage** (`pages/`)
- **Purpose**: Document management page
- **Features**:
  - Document list display
  - Upload form integration
  - Search and filtering
- **Route**: `/`

### Code Style
- TypeScript for type safety
- Functional components with hooks
- Tailwind CSS for styling

### Mobile Responsiveness

The application uses Tailwind's responsive breakpoints:

```
xs:  < 640px   - Extra small devices
sm:  ≥ 640px   - Small devices
md:  ≥ 768px   - Medium devices
lg:  ≥ 1024px  - Large devices
xl:  ≥ 1280px  - Extra large devices
```

Key responsive features:
- Collapsible mobile annotation panel
- Horizontal scrolling toolbar with hidden scrollbars
- Adaptive padding and text sizes
- Card/table layout switching
- Touch-optimized buttons and interactions

### Browser Support
- Chrome (recommended)
- Firefox
- Safari
- Edge

PDF.js worker loaded from CDN:
```typescript
pdfjs.GlobalWorkerOptions.workerSrc = 
  `//cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs`;
```

**Built with ❤️ by Aditya**