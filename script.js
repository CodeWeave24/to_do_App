document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const taskInput = document.getElementById('task-text');
    const dateInput = document.getElementById('task-date');
    const timeInput = document.getElementById('task-time');
    const addButton = document.getElementById('add-task');
    const tasksList = document.getElementById('tasks-list');
    const emptyState = document.getElementById('empty-state');
    const editModal = document.getElementById('edit-modal');
    const editTaskText = document.getElementById('edit-task-text');
    const editTaskDate = document.getElementById('edit-task-date');
    const editTaskTime = document.getElementById('edit-task-time');
    const updateButton = document.getElementById('update-task');
    const cancelEditButton = document.getElementById('cancel-edit');
    const closeModalButton = document.querySelector('.close-modal');
    const sortButtons = document.querySelectorAll('.sort-btn');
    const pendingCount = document.getElementById('pending-count');
    const completedCount = document.getElementById('completed-count');
    const charCount = document.getElementById('char-count');
    const editCharCount = document.getElementById('edit-char-count');
    
    // Application State
    let currentSort = 'date_asc';
    let editingTaskId = null;
    let tasks = [];
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
    dateInput.min = today;
    
    // Set default time to next hour
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    const timeString = nextHour.toTimeString().substring(0, 5);
    timeInput.value = timeString;
    
    // Initialize the application
    init();
    
    //  Initialize the application
    function init() {
        loadTasks();
        setupEventListeners();
    }
    
    // Set up all event listeners
    function setupEventListeners() {
        // Add task button
        addButton.addEventListener('click', addTask);
        
        // Enter key in task input
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTask();
            }
        });
        
        // Character count for task input
        taskInput.addEventListener('input', function() {
            charCount.textContent = this.value.length;
        });
        
        // Character count for edit task input
        editTaskText.addEventListener('input', function() {
            editCharCount.textContent = this.value.length;
        });
        
        // Sort buttons
        sortButtons.forEach(button => {
            button.addEventListener('click', function() {
                const sort = this.dataset.sort;
                setActiveSort(sort);
                loadTasks();
            });
        });
        
        // Modal buttons
        updateButton.addEventListener('click', updateTask);
        cancelEditButton.addEventListener('click', closeEditModal);
        closeModalButton.addEventListener('click', closeEditModal);
        
        // Close modal when clicking outside
        editModal.addEventListener('click', function(e) {
            if (e.target === editModal) {
                closeEditModal();
            }
        });
        
        // Escape key to close modal
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && editModal.style.display === 'flex') {
                closeEditModal();
            }
        });
    }
    
    // Load tasks from the server
    async function loadTasks() {
        try {
            showLoading();
            
            const response = await fetch(`api.php?sort=${currentSort}`);
            const result = await response.json();
            
            if (result.success) {
                tasks = result.data;
                renderTasks();
                updateStats();
                
                // Show/hide empty state
                if (tasks.length === 0) {
                    emptyState.style.display = 'block';
                    tasksList.style.display = 'none';
                } else {
                    emptyState.style.display = 'none';
                    tasksList.style.display = 'flex';
                }
            } else {
                showNotification('Error loading tasks', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Network error. Please try again.', 'error');
        }
    }
    
    // Render tasks to the DOM
    function renderTasks() {
        tasksList.innerHTML = '';
        
        tasks.forEach(task => {
            const taskElement = createTaskElement(task);
            tasksList.appendChild(taskElement);
        });
    }
    
    // Create a task element
    function createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.status}`;
        taskElement.dataset.id = task.id;
        
        // Format date for display
        const dueDate = new Date(`${task.task_date} ${task.task_time}`);
        const now = new Date();
        const isOverdue = dueDate < now && task.status === 'pending';
        
        if (isOverdue) {
            taskElement.classList.add('overdue');
        }
        
        taskElement.innerHTML = `
            <div class="task-content">
                <div class="task-text">${escapeHtml(task.task_text)}</div>
                <div class="task-meta">
                    <span class="task-date">
                        <i class="far fa-calendar-alt"></i>
                        ${task.formatted_date}
                    </span>
                    <span class="task-time">
                        <i class="far fa-clock"></i>
                        ${task.formatted_time}
                    </span>
                    <span class="task-status ${task.status}">
                        ${task.status === 'pending' ? 'Pending' : 'Completed'}
                        ${isOverdue ? ' (Overdue)' : ''}
                    </span>
                </div>
            </div>
            <div class="task-actions">
                <button class="action-btn complete" title="Mark as ${task.status === 'pending' ? 'completed' : 'pending'}">
                    <i class="fas fa-${task.status === 'pending' ? 'check-circle' : 'undo'}"></i>
                </button>
                <button class="action-btn edit" title="Edit task">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete" title="Delete task">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;
        
        // Add event listeners to action buttons
        const completeBtn = taskElement.querySelector('.complete');
        const editBtn = taskElement.querySelector('.edit');
        const deleteBtn = taskElement.querySelector('.delete');
        
        completeBtn.addEventListener('click', () => toggleTaskStatus(task.id, task.status));
        editBtn.addEventListener('click', () => openEditModal(task));
        deleteBtn.addEventListener('click', () => deleteTask(task.id));
        
        return taskElement;
    }
    
    // Add a new task
    async function addTask() {
        const taskText = taskInput.value.trim();
        const taskDate = dateInput.value;
        const taskTime = timeInput.value;
        
        // Validation
        if (!taskText) {
            showNotification('Please enter a task description', 'warning');
            taskInput.focus();
            return;
        }
        
        if (!taskDate) {
            showNotification('Please select a date', 'warning');
            dateInput.focus();
            return;
        }
        
        if (!taskTime) {
            showNotification('Please select a time', 'warning');
            timeInput.focus();
            return;
        }
        
        try {
            addButton.disabled = true;
            addButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
            
            const response = await fetch('api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    task_text: taskText,
                    task_date: taskDate,
                    task_time: taskTime
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Clear inputs
                taskInput.value = '';
                dateInput.value = today;
                timeInput.value = timeString;
                charCount.textContent = '0';
                
                // Show success message
                showNotification('Task added successfully', 'success');
                
                // Reload tasks
                loadTasks();
                
                // Scroll to tasks
                document.querySelector('.tasks-container').scrollIntoView({
                    behavior: 'smooth'
                });
            } else {
                showNotification(result.message || 'Failed to add task', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Network error. Please try again.', 'error');
        } finally {
            addButton.disabled = false;
            addButton.innerHTML = '<i class="fas fa-bolt"></i> Add Task';
        }
    }
    
    // Toggle task status between pending and completed
     
    async function toggleTaskStatus(taskId, currentStatus) {
        const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
        
        try {
            const response = await fetch(`api.php?id=${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status: newStatus
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification(`Task marked as ${newStatus}`, 'success');
                loadTasks();
            } else {
                showNotification(result.message || 'Failed to update task', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Network error. Please try again.', 'error');
        }
    }
    
    
    //Open edit modal with task data
    
    function openEditModal(task) {
        editingTaskId = task.id;
        editTaskText.value = task.task_text;
        editTaskDate.value = task.task_date;
        editTaskTime.value = task.task_time;
        editCharCount.textContent = task.task_text.length;
        
        editModal.style.display = 'flex';
        editTaskText.focus();
    }
    
    //Close edit modal
    function closeEditModal() {
        editModal.style.display = 'none';
        editingTaskId = null;
        editTaskText.value = '';
        editTaskDate.value = '';
        editTaskTime.value = '';
    }
    
    // Update task with edited data
    async function updateTask() {
        const taskText = editTaskText.value.trim();
        const taskDate = editTaskDate.value;
        const taskTime = editTaskTime.value;
        
        // Validation
        if (!taskText) {
            showNotification('Please enter a task description', 'warning');
            editTaskText.focus();
            return;
        }
        
        if (!taskDate) {
            showNotification('Please select a date', 'warning');
            editTaskDate.focus();
            return;
        }
        
        if (!taskTime) {
            showNotification('Please select a time', 'warning');
            editTaskTime.focus();
            return;
        }
        
        try {
            updateButton.disabled = true;
            updateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            
            const response = await fetch(`api.php?id=${editingTaskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    task_text: taskText,
                    task_date: taskDate,
                    task_time: taskTime
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('Task updated successfully', 'success');
                closeEditModal();
                loadTasks();
            } else {
                showNotification(result.message || 'Failed to update task', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Network error. Please try again.', 'error');
        } finally {
            updateButton.disabled = false;
            updateButton.innerHTML = '<i class="fas fa-save"></i> Save Changes';
        }
    }
    
    // Delete a task
    async function deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }
        
        try {
            const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
            const deleteBtn = taskElement.querySelector('.delete');
            
            deleteBtn.disabled = true;
            deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            
            const response = await fetch(`api.php?id=${taskId}`, {
                method: 'DELETE'
            });
            
            const result = await response.json();
            
            if (result.success) {
                showNotification('Task deleted successfully', 'success');
                loadTasks();
            } else {
                showNotification(result.message || 'Failed to delete task', 'error');
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Network error. Please try again.', 'error');
        }
    }
    
    //  Set active sort and update UI
    function setActiveSort(sort) {
        currentSort = sort;
        
        sortButtons.forEach(button => {
            if (button.dataset.sort === sort) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
    
    // Update statistics counters
    function updateStats() {
        const pending = tasks.filter(task => task.status === 'pending').length;
        const completed = tasks.filter(task => task.status === 'completed').length;
        
        pendingCount.textContent = pending;
        completedCount.textContent = completed;
    }
    
    //  Show loading state
     
    function showLoading() {
        tasksList.innerHTML = `
            <div class="loading">
                <div class="neon-spinner"></div>
                <p>Loading tasks...</p>
            </div>
        `;
        tasksList.style.display = 'flex';
        emptyState.style.display = 'none';
    }
    
    // Show notification message
    function showNotification(message, type = 'info') {
        // Remove existing notification
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? 'rgba(0, 255, 157, 0.15)' : 
                        type === 'error' ? 'rgba(255, 0, 100, 0.15)' : 
                        type === 'warning' ? 'rgba(255, 200, 0, 0.15)' : 
                        'rgba(0, 255, 255, 0.15)'};
            border-left: 4px solid ${type === 'success' ? 'var(--neon-green)' : 
                                type === 'error' ? '#ff0064' : 
                                type === 'warning' ? '#ffcc00' : 
                                'var(--neon-cyan)'};
            border-radius: 8px;
            color: white;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 15px;
            max-width: 400px;
            z-index: 1001;
            backdrop-filter: blur(10px);
            animation: fadeIn 0.3s ease-out, fadeOut 0.3s ease-out 3s forwards;
        `;
        
        // Add close button functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'fadeOut 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        });
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'fadeOut 0.3s ease-out forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Add CSS for fadeOut animation if not exists
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes fadeOut {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(20px); }
            }
            
            .notification-close {
                background: none;
                border: none;
                color: rgba(255, 255, 255, 0.7);
                cursor: pointer;
                font-size: 1rem;
                transition: color 0.2s ease;
            }
            
            .notification-close:hover {
                color: white;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .task-item.overdue .task-status.pending {
                color: #ff5555;
                background: rgba(255, 85, 85, 0.15);
            }
        `;
        document.head.appendChild(style);
    }
});