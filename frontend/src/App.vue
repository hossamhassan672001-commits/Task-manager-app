<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api'
const tasks = ref([])
const loading = ref(true)
const submitting = ref(false)
const submittingAuth = ref(false)
const savingEdit = ref(false)
const error = ref('')
const editDialog = ref(false)
const statusOptions = [
  { label: 'Open', value: 'open' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Done', value: 'done' }
]

const token = ref(localStorage.getItem('task_token') || '')
const user = ref(null)
const authMode = ref('login')
const authForm = reactive({
  name: '',
  email: '',
  password: ''
})

const form = reactive({
  title: '',
  description: '',
  status: 'open'
})

const editForm = reactive({
  id: null,
  title: '',
  description: '',
  status: 'open'
})

const isAuthenticated = computed(() => !!token.value)

const stats = computed(() => {
  const totals = { open: 0, in_progress: 0, done: 0 }
  tasks.value.forEach((task) => {
    if (totals[task.status] !== undefined) {
      totals[task.status] += 1
    }
  })
  return totals
})

const labelFor = (status) => {
  const match = statusOptions.find((option) => option.value === status)
  return match ? match.label : 'Open'
}

let errorTimer
const handleError = (message) => {
  error.value = message
  if (errorTimer) {
    clearTimeout(errorTimer)
  }
  errorTimer = setTimeout(() => {
    error.value = ''
  }, 4000)
}

const authHeaders = () => ({
  Authorization: `Bearer ${token.value}`
})

const setSession = (payload) => {
  token.value = payload.token
  user.value = payload.user
  localStorage.setItem('task_token', payload.token)
  localStorage.setItem('task_user', JSON.stringify(payload.user))
}

const clearSession = () => {
  token.value = ''
  user.value = null
  localStorage.removeItem('task_token')
  localStorage.removeItem('task_user')
}

const fetchTasks = async () => {
  if (!token.value) {
    tasks.value = []
    loading.value = false
    return
  }

  loading.value = true
  try {
    const response = await fetch(`${apiBase}/tasks`, {
      headers: authHeaders()
    })
    if (!response.ok) {
      if (response.status === 401) {
        clearSession()
      }
      throw new Error('Failed to load tasks')
    }
    const data = await response.json()
    tasks.value = data.tasks || []
  } catch (err) {
    handleError(err.message || 'Failed to load tasks')
  } finally {
    loading.value = false
  }
}

const login = async () => {
  submittingAuth.value = true
  try {
    const response = await fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: authForm.email,
        password: authForm.password
      })
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Failed to login')
    }
    setSession(data)
    authForm.password = ''
    await fetchTasks()
  } catch (err) {
    handleError(err.message || 'Failed to login')
  } finally {
    submittingAuth.value = false
  }
}

const register = async () => {
  submittingAuth.value = true
  try {
    const response = await fetch(`${apiBase}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: authForm.name,
        email: authForm.email,
        password: authForm.password
      })
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Failed to register')
    }
    setSession(data)
    authForm.password = ''
    await fetchTasks()
  } catch (err) {
    handleError(err.message || 'Failed to register')
  } finally {
    submittingAuth.value = false
  }
}

const logout = () => {
  clearSession()
  tasks.value = []
}

const createTask = async () => {
  if (!token.value) {
    handleError('Please login to create tasks')
    return
  }

  submitting.value = true
  try {
    const response = await fetch(`${apiBase}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        status: form.status
      })
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Failed to create task')
    }
    form.title = ''
    form.description = ''
    form.status = 'open'
    await fetchTasks()
  } catch (err) {
    handleError(err.message || 'Failed to create task')
  } finally {
    submitting.value = false
  }
}

const openEdit = (task) => {
  editForm.id = task.id
  editForm.title = task.title
  editForm.description = task.description
  editForm.status = task.status
  editDialog.value = true
}

const saveEdit = async () => {
  savingEdit.value = true
  try {
    const response = await fetch(`${apiBase}/tasks/${editForm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        title: editForm.title,
        description: editForm.description,
        status: editForm.status
      })
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.message || 'Failed to update task')
    }
    editDialog.value = false
    await fetchTasks()
  } catch (err) {
    handleError(err.message || 'Failed to update task')
  } finally {
    savingEdit.value = false
  }
}

const deleteTask = async (id) => {
  if (!window.confirm('Delete this task?')) {
    return
  }
  try {
    const response = await fetch(`${apiBase}/tasks/${id}`, {
      method: 'DELETE',
      headers: authHeaders()
    })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.message || 'Failed to delete task')
    }
    await fetchTasks()
  } catch (err) {
    handleError(err.message || 'Failed to delete task')
  }
}

onMounted(() => {
  const storedUser = localStorage.getItem('task_user')
  if (storedUser) {
    try {
      user.value = JSON.parse(storedUser)
    } catch (error) {
      user.value = null
    }
  }
  fetchTasks()
})
</script>

<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="app-shell">
        <div class="hero">
          <div class="hero-panel">
            <h1 class="app-title">Task Harbor</h1>
            <p>Track work with a calm, focused task board.</p>
            <div class="stat-grid">
              <div class="stat-card">
                <div class="task-meta">Open</div>
                <strong>{{ stats.open }}</strong>
              </div>
              <div class="stat-card">
                <div class="task-meta">In progress</div>
                <strong>{{ stats.in_progress }}</strong>
              </div>
              <div class="stat-card">
                <div class="task-meta">Done</div>
                <strong>{{ stats.done }}</strong>
              </div>
            </div>
          </div>
          <div class="hero-panel form-panel">
            <div class="row items-center justify-between">
              <div class="text-h6 app-title">
                {{ isAuthenticated ? 'Add new task' : 'Welcome back' }}
              </div>
              <q-btn
                v-if="isAuthenticated"
                flat
                color="negative"
                icon="logout"
                label="Logout"
                @click="logout"
              />
            </div>

            <div v-if="isAuthenticated" class="q-mt-md">
              <div class="task-meta q-mb-sm">
                Signed in as {{ user?.name || user?.email }}
              </div>
              <q-form @submit.prevent="createTask" class="q-gutter-md">
                <q-input
                  filled
                  v-model="form.title"
                  label="Task title"
                  :disable="submitting"
                  maxlength="120"
                  lazy-rules
                  :rules="[(val) => !!val || 'Title is required']"
                />
                <q-input
                  filled
                  v-model="form.description"
                  label="What needs to happen?"
                  type="textarea"
                  :disable="submitting"
                  maxlength="480"
                />
                <q-select
                  filled
                  v-model="form.status"
                  :options="statusOptions"
                  label="Status"
                  emit-value
                  map-options
                  :disable="submitting"
                />
                <q-btn
                  type="submit"
                  color="deep-orange-5"
                  text-color="white"
                  label="Create task"
                  :loading="submitting"
                  class="full-width"
                />
              </q-form>
            </div>

            <div v-else class="q-mt-md">
              <q-tabs v-model="authMode" dense class="text-grey-7" active-color="deep-orange-5">
                <q-tab name="login" label="Login" />
                <q-tab name="register" label="Register" />
              </q-tabs>
              <q-separator class="q-mb-md" />
              <q-tab-panels v-model="authMode" animated>
                <q-tab-panel name="login">
                  <q-form @submit.prevent="login" class="q-gutter-md">
                    <q-input
                      filled
                      v-model="authForm.email"
                      label="Email"
                      type="email"
                      :disable="submittingAuth"
                    />
                    <q-input
                      filled
                      v-model="authForm.password"
                      label="Password"
                      type="password"
                      :disable="submittingAuth"
                    />
                    <q-btn
                      type="submit"
                      color="deep-orange-5"
                      text-color="white"
                      label="Login"
                      :loading="submittingAuth"
                      class="full-width"
                    />
                  </q-form>
                </q-tab-panel>
                <q-tab-panel name="register">
                  <q-form @submit.prevent="register" class="q-gutter-md">
                    <q-input
                      filled
                      v-model="authForm.name"
                      label="Name"
                      :disable="submittingAuth"
                    />
                    <q-input
                      filled
                      v-model="authForm.email"
                      label="Email"
                      type="email"
                      :disable="submittingAuth"
                    />
                    <q-input
                      filled
                      v-model="authForm.password"
                      label="Password"
                      type="password"
                      :disable="submittingAuth"
                    />
                    <q-btn
                      type="submit"
                      color="deep-orange-5"
                      text-color="white"
                      label="Create account"
                      :loading="submittingAuth"
                      class="full-width"
                    />
                  </q-form>
                </q-tab-panel>
              </q-tab-panels>
            </div>
          </div>
        </div>

        <q-banner v-if="error" class="bg-red-2 text-red-9 q-mb-md" rounded>
          {{ error }}
        </q-banner>

        <div class="section-head">
          <div>
            <div class="text-h6 app-title">Tasks</div>
            <div class="task-meta">Keep the board in sync with your day.</div>
          </div>
          <q-btn
            outline
            color="deep-orange-5"
            icon="refresh"
            label="Refresh"
            :loading="loading"
            @click="fetchTasks"
            :disable="!isAuthenticated"
          />
        </div>

        <div v-if="!isAuthenticated" class="empty-state">
          Sign in to view and manage your tasks.
        </div>

        <div v-else class="list-shell">
          <q-card class="task-card" v-if="loading">
            <q-card-section>
              <div class="row items-center">
                <q-spinner size="24px" color="deep-orange-5" />
                <span class="q-ml-sm">Loading tasks...</span>
              </div>
            </q-card-section>
          </q-card>

          <div v-if="!loading && tasks.length === 0" class="empty-state">
            No tasks yet. Add your first task to get started.
          </div>

          <q-card v-for="task in tasks" :key="task.id" class="task-card">
            <q-card-section>
              <div class="row items-start justify-between">
                <div>
                  <div class="text-h6">{{ task.title }}</div>
                  <div class="task-meta q-mt-xs">{{ task.description || 'No description' }}</div>
                </div>
                <span class="badge" :class="task.status">
                  <q-icon name="task_alt" size="18px" />
                  {{ labelFor(task.status) }}
                </span>
              </div>
            </q-card-section>
            <q-separator />
            <q-card-actions align="right">
              <q-btn flat color="primary" label="Edit" @click="openEdit(task)" />
              <q-btn flat color="negative" label="Delete" @click="deleteTask(task.id)" />
            </q-card-actions>
          </q-card>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>

  <q-dialog v-model="editDialog">
    <q-card style="min-width: 320px">
      <q-card-section>
        <div class="text-h6 app-title">Update task</div>
      </q-card-section>
      <q-card-section class="q-pt-none">
        <q-form @submit.prevent="saveEdit" class="q-gutter-md">
          <q-input
            filled
            v-model="editForm.title"
            label="Task title"
            maxlength="120"
            :rules="[(val) => !!val || 'Title is required']"
          />
          <q-input
            filled
            v-model="editForm.description"
            label="Description"
            type="textarea"
            maxlength="480"
          />
          <q-select
            filled
            v-model="editForm.status"
            :options="statusOptions"
            label="Status"
            emit-value
            map-options
          />
          <div class="row justify-end q-gutter-sm">
            <q-btn flat label="Cancel" v-close-popup />
            <q-btn
              color="deep-orange-5"
              text-color="white"
              label="Save"
              type="submit"
              :loading="savingEdit"
            />
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
