package br.com.sualistapessoal.gerenciador_tarefas;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column
    private Integer age;

    // --- CORREÇÃO APLICADA AQUI ---
    @Basic(fetch = FetchType.EAGER) // ADICIONE ESTA LINHA
    @Lob // Anotação para campos grandes
    @Column(columnDefinition = "TEXT") // Define o tipo da coluna como TEXT para strings longas
    private String photo; // CAMPO PARA A FOTO

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Task> tasks;

    // Getters e Setters (incluindo o da foto)
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public String getPhoto() { return photo; } // GETTER DA FOTO
    public void setPhoto(String photo) { this.photo = photo; } // SETTER DA FOTO
    public List<Task> getTasks() { return tasks; }
    public void setTasks(List<Task> tasks) { this.tasks = tasks; }
}