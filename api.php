<?php
//API for To-Do List Application

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'db.php';

// Initialize database
$database = new Database();
$db = $database->connect();

// Get request method
$method = $_SERVER['REQUEST_METHOD'];

// Get task ID
$task_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

// Main API routing
try {
    switch ($method) {
        case 'GET':
            if ($task_id > 0) {
                $query = "SELECT * FROM tasks WHERE id = :id";
                $stmt = $db->prepare($query);
                $stmt->bindParam(':id', $task_id);
                $stmt->execute();
                
                if ($stmt->rowCount() > 0) {
                    $task = $stmt->fetch(PDO::FETCH_ASSOC);
                    echo json_encode(['success' => true, 'data' => $task]);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Task not found']);
                }
            } else {
                $sort = isset($_GET['sort']) ? $_GET['sort'] : 'date_asc';
                
                switch ($sort) {
                    case 'date_desc':
                        $order_by = "task_date DESC, task_time DESC";
                        break;
                    case 'status':
                        $order_by = "status ASC, task_date ASC, task_time ASC";
                        break;
                    default:
                        $order_by = "task_date ASC, task_time ASC";
                }
                
                $query = "SELECT * FROM tasks ORDER BY $order_by";
                $stmt = $db->prepare($query);
                $stmt->execute();
                
                $tasks = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($tasks as &$task) {
                    $task['formatted_date'] = date('M d, Y', strtotime($task['task_date']));
                    $task['formatted_time'] = date('g:i A', strtotime($task['task_time']));
                }
                
                echo json_encode(['success' => true, 'data' => $tasks]);
            }
            break;

        case 'POST':
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (!isset($data['task_text']) || !isset($data['task_date']) || !isset($data['task_time'])) {
                echo json_encode(['success' => false, 'message' => 'Missing required fields']);
                break;
            }
            
            $query = "INSERT INTO tasks (task_text, task_date, task_time) 
                     VALUES (:task_text, :task_date, :task_time)";
            
            $stmt = $db->prepare($query);
            $stmt->bindParam(':task_text', $data['task_text']);
            $stmt->bindParam(':task_date', $data['task_date']);
            $stmt->bindParam(':task_time', $data['task_time']);
            
            if ($stmt->execute()) {
                $last_id = $db->lastInsertId();
                echo json_encode([
                    'success' => true, 
                    'message' => 'Task added successfully',
                    'id' => $last_id
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to add task']);
            }
            break;

        case 'PUT':
            $data = json_decode(file_get_contents("php://input"), true);
            
            if ($task_id === 0) {
                echo json_encode(['success' => false, 'message' => 'Task ID required']);
                break;
            }
            
            $update_fields = [];
            $params = [':id' => $task_id];
            
            if (isset($data['task_text'])) {
                $update_fields[] = "task_text = :task_text";
                $params[':task_text'] = $data['task_text'];
            }
            
            if (isset($data['task_date'])) {
                $update_fields[] = "task_date = :task_date";
                $params[':task_date'] = $data['task_date'];
            }
            
            if (isset($data['task_time'])) {
                $update_fields[] = "task_time = :task_time";
                $params[':task_time'] = $data['task_time'];
            }
            
            if (isset($data['status'])) {
                $update_fields[] = "status = :status";
                $params[':status'] = $data['status'];
            }
            
            if (empty($update_fields)) {
                echo json_encode(['success' => false, 'message' => 'No fields to update']);
                break;
            }
            
            $query = "UPDATE tasks SET " . implode(', ', $update_fields) . " WHERE id = :id";
            $stmt = $db->prepare($query);
            
            foreach ($params as $key => $value) {
                $stmt->bindValue($key, $value);
            }
            
            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Task updated successfully']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to update task']);
            }
            break;

        case 'DELETE':
            if ($task_id === 0) {
                echo json_encode(['success' => false, 'message' => 'Task ID required']);
                break;
            }
            
            $query = "DELETE FROM tasks WHERE id = :id";
            $stmt = $db->prepare($query);
            $stmt->bindParam(':id', $task_id);
            
            if ($stmt->execute()) {
                echo json_encode(['success' => true, 'message' => 'Task deleted successfully']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to delete task']);
            }
            break;

        default:
            echo json_encode(['success' => false, 'message' => 'Invalid request method']);
            break;
    }
    
} catch (PDOException $e) {
    error_log("API Error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Server error occurred']);
}
?>