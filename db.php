<?php
// Database Connection File

class Database {
    private $host = 'localhost';
    private $db_name = 'todo_app';
    private $username = 'root';
    private $password = '';
    private $conn;

    public function connect() {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name,
                $this->username,
                $this->password,
                array(PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION)
            );
            
            $this->conn->exec("set names utf8mb4");
            
        } catch(PDOException $exception) {
            error_log("Connection error: " . $exception->getMessage());

            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed'
            ]);
            exit();
        }

        return $this->conn;
    }
}
?>