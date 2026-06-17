
# Analyse détaillée du projet **Student Enrollment System**  
Projet Spring Boot en architecture microservices

> Document pédagogique destiné à une soutenance universitaire.  
> Analyse basée sur le code source présent dans l’archive du projet.

---

## 0. Vue d’ensemble du projet

Ce projet implémente un système d’inscription d’étudiants organisé en plusieurs microservices :

- **Discovery Server** : registre central des services.
- **API Gateway** : point d’entrée unique pour le front-end.
- **Student Service** : gestion des étudiants.
- **Course Service** : gestion des cours.
- **Enrollment Service** : gestion des inscriptions entre étudiants et cours.
- **Dashboard Frontend** : interface web statique qui consomme l’API Gateway.

Le principe général est le suivant :

```text
Navigateur / Dashboard
        |
        v
   API Gateway
        |
        +--> Student Service
        +--> Course Service
        +--> Enrollment Service
        |
        v
   Eureka Discovery Server
```

Le cœur métier est situé dans **Enrollment Service** :
- il vérifie qu’un étudiant existe,
- il vérifie qu’un cours existe,
- il empêche les doubles inscriptions,
- il limite la capacité d’un cours,
- il permet l’annulation dans une fenêtre de 24h.

---

## 1. Architecture globale et logique métier

### 1.1 Pourquoi une architecture microservices ?

Une architecture microservices découpe le système en petits services indépendants, chacun responsable d’un domaine métier précis.

Dans ce projet :
- **Student Service** gère uniquement les étudiants.
- **Course Service** gère uniquement les cours.
- **Enrollment Service** gère uniquement les inscriptions.
- **Discovery Server** permet aux services de se trouver.
- **API Gateway** centralise les accès.
- **Frontend** présente les données à l’utilisateur.

### 1.2 Avantages dans ce projet

- **Séparation des responsabilités**.
- **Déploiement indépendant**.
- **Évolution plus simple** de chaque service.
- **Tolérance aux changements** : on peut modifier un service sans casser tout le projet.
- **Lisibilité métier** : chaque module correspond à un concept réel.

### 1.3 Limites du projet actuel

- Pas de **Spring Security**.
- Pas de **JWT**, pas de gestion de rôles.
- Pas de **message broker** (Kafka/RabbitMQ).
- Pas de **résilience avancée** (Circuit Breaker, Retry, Fallback).
- Les microservices communiquent surtout via appels synchrones `WebClient`.
- Les entités sont souvent exposées directement dans les services Student et Course.

---

# 2. Module : Discovery Server

## 2.1 Présentation générale

### Rôle du module
Le Discovery Server est le **registre central** des microservices.  
Il permet aux services de s’enregistrer et de se découvrir les uns les autres.

### Pourquoi ce module existe-t-il ?
Sans registre de découverte, chaque service devrait connaître manuellement :
- l’adresse IP,
- le port,
- l’état des autres services.

Cela rendrait l’architecture rigide et difficile à maintenir.

### Problème résolu
Il évite la configuration statique des URLs entre services.

### Sans ce module
- les services devraient appeler des URL en dur ;
- un changement de port casserait la communication ;
- le système serait moins scalable ;
- la gestion de plusieurs instances serait compliquée.

---

## 2.2 Fonctionnement interne

### Démarrage
Le service démarre via :

```java
@SpringBootApplication
@EnableEurekaServer
public class DiscoveryServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(DiscoveryServerApplication.class, args);
    }
}
```

Au démarrage :
1. Spring Boot lit la configuration.
2. Le contexte Spring est créé.
3. Eureka Server est activé.
4. Le serveur écoute sur le port `8761`.

### Composants Spring utilisés
- `@SpringBootApplication`
- `@EnableEurekaServer`

### Interaction avec les autres services
Les microservices clients s’enregistrent automatiquement dans Eureka grâce à :
- `eureka.client.service-url.defaultZone=http://localhost:8761/eureka/`
- `spring.application.name=...`

### Flux de données
Le Discovery Server ne traite pas de données métier.  
Il stocke seulement les métadonnées de services :
- nom du service,
- adresse,
- port,
- statut.

---

## 2.3 Analyse du code

### Fichier : `discovery-server/src/main/java/com/example/discoveryserver/DiscoveryServerApplication.java`

```java
@SpringBootApplication
@EnableEurekaServer
public class DiscoveryServerApplication {
    public static void main(String[] args) {
        SpringApplication.run(DiscoveryServerApplication.class, args);
    }
}
```

#### Rôle de la classe
C’est la classe d’entrée du microservice.

#### Rôle des annotations
- `@SpringBootApplication` :
  - active l’auto-configuration Spring Boot,
  - lance le scan des composants,
  - combine `@Configuration`, `@EnableAutoConfiguration`, `@ComponentScan`.
- `@EnableEurekaServer` :
  - transforme l’application en serveur Eureka.

#### Ce qui se passe à l’exécution
- le contexte Spring démarre,
- le serveur Eureka est exposé,
- les autres services peuvent s’y enregistrer.

---

## 2.4 Architecture Spring du module

### Controller
Aucun controller métier.

### Service
Aucun service métier.

### Repository
Aucun repository.

### Entity
Aucune entité.

### DTO
Aucun DTO.

### Config
La configuration se trouve dans `application.properties`.

### Exception
Pas de gestion d’exceptions métier.

### Client WebClient
Aucun.

### Filter
Aucun.

### Security
Aucune sécurité définie.

---

## 2.5 Analyse des annotations utilisées

### `@SpringBootApplication`
Annotation de base d’une application Spring Boot.

### `@EnableEurekaServer`
Active le rôle de registre Eureka.

---

## 2.6 Analyse des fichiers de configuration

### `discovery-server/src/main/resources/application.properties`

```properties
spring.application.name=discovery-server
server.port=8761
eureka.client.register-with-eureka=false
eureka.client.fetch-registry=false
```

#### Ligne par ligne

- `spring.application.name=discovery-server`
  - nom logique du service dans l’écosystème Spring Cloud.

- `server.port=8761`
  - port standard d’Eureka Server.

- `eureka.client.register-with-eureka=false`
  - le serveur Eureka ne doit pas s’enregistrer chez lui-même.

- `eureka.client.fetch-registry=false`
  - le serveur ne récupère pas le registre depuis un autre Eureka.

---

## 2.7 Communication avec les autres microservices

Le Discovery Server est consulté indirectement par :
- `student-service`
- `course-service`
- `enrollment-service`
- `api-gateway`

Ces services s’enregistrent avec leur `spring.application.name`.

---

## 2.8 Scénario métier lié au Discovery Server

### Démarrage global de l’architecture
1. Le Discovery Server démarre.
2. Le Student Service s’enregistre comme `student-service`.
3. Le Course Service s’enregistre comme `course-service`.
4. Le Enrollment Service s’enregistre comme `enrollment-service`.
5. Le Gateway découvre les services par leur nom logique.

---

## 2.9 Questions possibles du professeur

**Question : Pourquoi utiliser Eureka ?**  
**Réponse :** Eureka permet la découverte dynamique des services. Au lieu d’écrire des URL fixes, on utilise des noms de services. Cela rend l’architecture plus flexible, plus maintenable et compatible avec plusieurs instances.

**Question : Que se passe-t-il si un service change de port ?**  
**Réponse :** Si le service est enregistré dans Eureka et consommé via `lb://nom-service`, les autres microservices n’ont pas besoin de connaître le nouveau port. Le registre fournit l’adresse actuelle.

**Question : Le Discovery Server contient-il des données métier ?**  
**Réponse :** Non. Il contient seulement la liste des services disponibles et leur état.

---

## 2.10 Ce qu’il faut absolument retenir

- Eureka centralise la découverte des services.
- Les microservices évitent les URLs en dur.
- Le Discovery Server ne gère aucune donnée métier.

### Réponse courte pour l’oral
Le Discovery Server est le registre central de l’architecture. Tous les microservices s’y enregistrent, et les autres les découvrent via leur nom logique au lieu d’utiliser une adresse fixe.

---

# 3. Module : API Gateway

## 3.1 Présentation générale

### Rôle du module
L’API Gateway est le **point d’entrée unique** du front-end.  
Le navigateur appelle uniquement le Gateway, qui redirige ensuite vers le bon microservice.

### Pourquoi ce module existe-t-il ?
Il évite au front-end de connaître toutes les URLs des microservices.

### Problème résolu
Sans gateway :
- le front-end devrait appeler directement `student-service`, `course-service`, `enrollment-service`;
- la logique d’accès serait dispersée ;
- le CORS serait plus complexe ;
- les changements d’architecture seraient plus lourds.

### Sans ce module
- multiplication des points d’entrée ;
- logique de routage côté client ;
- communication moins propre ;
- difficulté d’ajouter des filtres globaux.

---

## 3.2 Fonctionnement interne

### Démarrage
La classe principale démarre le service :

```java
@SpringBootApplication
public class ApiGatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
```

Le Gateway :
1. démarre sur le port `8080`,
2. s’enregistre auprès d’Eureka,
3. charge ses routes depuis `application.properties`,
4. applique la configuration CORS.

### Composants Spring utilisés
- Spring Boot
- Spring Cloud Gateway Server WebMVC
- Eureka Client
- CORS Filter

### Interactions
Le Gateway redirige vers :
- `lb://student-service`
- `lb://course-service`
- `lb://enrollment-service`

Le préfixe `lb://` signifie : **load-balanced** via Eureka / Spring Cloud LoadBalancer.

### Flux de données
Le front envoie une requête au Gateway.
Le Gateway :
1. lit l’URL,
2. compare avec les predicates,
3. choisit le service cible,
4. transfère la requête,
5. renvoie la réponse au front.

---

## 3.3 Analyse du code

### Fichier : `api-gateway/src/main/java/com/example/apigateway/ApiGatewayApplication.java`

```java
@SpringBootApplication
public class ApiGatewayApplication {
    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }
}
```

#### Rôle
Point d’entrée du Gateway.

#### Annotation
- `@SpringBootApplication` lance toute l’infrastructure Spring Boot.

---

### Fichier : `api-gateway/src/main/java/com/example/apigateway/config/GatewayCorsConfig.java`

```java
@Configuration
public class GatewayCorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsFilter(source);
    }
}
```

#### Rôle de la classe
Elle configure le CORS au niveau du Gateway.

#### Pourquoi elle existe ?
Le front-end est servi séparément et appelle l’API via navigateur.  
Le navigateur applique donc la politique CORS.

#### Explication des lignes
- `@Configuration` : classe de configuration Spring.
- `@Bean` : crée un objet géré par Spring.
- `CorsConfiguration config = new CorsConfiguration();`
  - crée la règle CORS.
- `setAllowedOriginPatterns(List.of("*"))`
  - autorise toutes les origines.
- `setAllowedMethods(...)`
  - autorise les méthodes HTTP classiques.
- `setAllowedHeaders(List.of("*"))`
  - autorise tous les headers.
- `setAllowCredentials(false)`
  - interdit l’envoi de cookies/credentials.
- `UrlBasedCorsConfigurationSource source = ...`
  - associe la config à des chemins.
- `registerCorsConfiguration("/**", config)`
  - applique la règle à toutes les routes.
- `return new CorsFilter(source);`
  - le filtre CORS est utilisé par le Gateway.

---

## 3.4 Analyse des fichiers de configuration

### `api-gateway/src/main/resources/application.properties`

```properties
spring.application.name=api-gateway
server.port=8080

spring.cloud.gateway.server.webmvc.routes[0].id=student-service
spring.cloud.gateway.server.webmvc.routes[0].uri=lb://student-service
spring.cloud.gateway.server.webmvc.routes[0].predicates[0]=Path=/api/students/**

spring.cloud.gateway.server.webmvc.routes[1].id=course-service
spring.cloud.gateway.server.webmvc.routes[1].uri=lb://course-service
spring.cloud.gateway.server.webmvc.routes[1].predicates[0]=Path=/api/courses/**

spring.cloud.gateway.server.webmvc.routes[2].id=enrollment-service
spring.cloud.gateway.server.webmvc.routes[2].uri=lb://enrollment-service
spring.cloud.gateway.server.webmvc.routes[2].predicates[0]=Path=/api/enrollments/**

eureka.client.service-url.defaultZone=http://localhost:8761/eureka/
```

#### Explication ligne par ligne

- `spring.application.name=api-gateway`
  - nom du service dans Eureka.

- `server.port=8080`
  - port du point d’entrée principal.

- `spring.cloud.gateway.server.webmvc.routes[0].id=student-service`
  - identifiant de la route.

- `uri=lb://student-service`
  - redirection vers le service enregistré dans Eureka.

- `predicates[0]=Path=/api/students/**`
  - la route s’applique à tous les chemins sous `/api/students/`.

Même logique pour :
- `/api/courses/**`
- `/api/enrollments/**`

- `eureka.client.service-url.defaultZone=...`
  - adresse du registre Eureka.

---

## 3.5 Architecture Spring du module

### Controller
Aucun controller métier direct.

### Service
Pas de service métier.

### Repository
Aucun.

### Entity
Aucune.

### DTO
Aucun.

### Config
`GatewayCorsConfig` et `application.properties`.

### Exception
Pas d’exception métier spécifique.

### Client WebClient
Aucun.

### Filter
`CorsFilter` est le filtre principal.

### Security
Pas de Spring Security dans le code.

---

## 3.6 Analyse des annotations utilisées

- `@SpringBootApplication`
- `@Configuration`
- `@Bean`

---

## 3.7 Scénario métier : passage d’une requête via le Gateway

Exemple : consultation des étudiants.

1. Le front appelle `GET http://localhost:8080/api/students/cnie/CD2387`.
2. Le Gateway lit la route.
3. Le Gateway voit que le chemin correspond à `/api/students/**`.
4. Il résout `student-service` via Eureka.
5. Il transmet la requête au Student Service.
6. Le Student Service répond.
7. Le Gateway renvoie la réponse au navigateur.

---

## 3.8 Questions possibles du professeur

**Question : Pourquoi utiliser un Gateway ?**  
**Réponse :** Le Gateway centralise les accès, simplifie le front-end, réduit les problèmes CORS et permet d’ajouter plus tard de la sécurité, du logging ou du rate limiting à un seul endroit.

**Question : Que signifie `lb://student-service` ?**  
**Réponse :** Cela signifie que la destination est un service découvert via Eureka et qu’un load balancer choisira l’instance cible.

**Question : Pourquoi mettre le CORS au Gateway ?**  
**Réponse :** Parce que tous les appels du navigateur passent par le Gateway. Cela centralise la politique d’accès cross-origin.

---

## 3.9 Ce qu’il faut absolument retenir

- Le Gateway est l’entrée unique du système.
- Il route les requêtes vers les services.
- Il gère ici le CORS.

### Réponse courte pour l’oral
Le Gateway reçoit toutes les requêtes du front-end, les route vers le bon microservice via Eureka, et applique la politique CORS pour permettre au navigateur de communiquer avec le backend.

---

# 4. Module : Student Service

## 4.1 Présentation générale

### Rôle du module
Le Student Service gère le cycle de vie des étudiants :
- création,
- lecture,
- mise à jour,
- suppression,
- recherche par ID ou CNIE.

### Pourquoi ce module existe-t-il ?
Les informations des étudiants doivent être isolées dans un service dédié.

### Problème résolu
Il permet de centraliser les règles métiers sur l’identité étudiante.

### Sans ce module
- les étudiants seraient stockés dans le même service que les cours ou inscriptions ;
- le système serait moins modulaire ;
- les dépendances augmenteraient.

---

## 4.2 Fonctionnement interne

### Démarrage
La classe `StudentServiceApplication` lance Spring Boot.

Au démarrage :
1. Spring lit les propriétés.
2. JPA se connecte à MySQL (`student_db`).
3. Le contexte Spring charge `StudentRepository`, `StudentService`, `StudentController`.
4. `DataInitializer` insère des étudiants si la table est vide.
5. Le service s’enregistre auprès d’Eureka.

### Composants Spring utilisés
- `@SpringBootApplication`
- `@RestController`
- `@Service`
- `@Repository`
- `@Entity`
- `@Table`
- `@RestControllerAdvice`
- `CommandLineRunner`
- Validation (`jakarta.validation`)

### Interactions
- Le front-end consulte les étudiants via le Gateway.
- Enrollment Service appelle `student-service` via WebClient.
- Eureka permet la découverte du service.

### Flux de données
1. Requête HTTP.
2. Controller.
3. Service.
4. Repository.
5. Base MySQL.
6. Retour JSON.

---

## 4.3 Analyse du code

### Fichier : `StudentServiceApplication.java`

```java
@SpringBootApplication
public class StudentServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(StudentServiceApplication.class, args);
    }
}
```

#### Rôle
Démarre le service.

---

### Fichier : `config/DataInitializer.java`

```java
@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initStudents(StudentRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                repository.save(new Student(null, "CD2387", "Rachid", "Sahraoui", "rachid.sahraoui@example.com"));
                repository.save(new Student(null, "AB1234", "Sara", "El Amrani", "sara.elamrani@example.com"));
                repository.save(new Student(null, "ZH9090", "Youssef", "Benali", "youssef.benali@example.com"));
                repository.save(new Student(null, "MA5555", "Imane", "Alaoui", "imane.alaoui@example.com"));
            }
        };
    }
}
```

#### Rôle
Initialise des données de démonstration.

#### Explication
- `@Configuration` : classe de configuration.
- `@Bean` : produit un `CommandLineRunner`.
- `CommandLineRunner` s’exécute après le démarrage de Spring.
- `if (repository.count() == 0)` : évite de dupliquer les données.
- `repository.save(...)` : insère les étudiants de départ.

---

### Fichier : `entities/Student.java`

```java
@Entity
@Table(
        name = "students",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = "cnie"),
                @UniqueConstraint(columnNames = "email")
        }
)
public class Student {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "CNIE is required")
    @Column(nullable = false, unique = true)
    private String cnie;

    @NotBlank(message = "First name is required")
    @Column(nullable = false)
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Column(nullable = false)
    private String lastName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    @Column(nullable = false, unique = true)
    private String email;
}
```

#### Rôle métier
Représente un étudiant.

#### Attributs
- `id` : identifiant technique.
- `cnie` : identifiant étudiant unique.
- `firstName`
- `lastName`
- `email`

#### Contraintes
- CNIE unique.
- Email unique.
- Champs obligatoires.

---

### Fichier : `repositories/StudentRepository.java`

```java
public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByCnie(String cnie);
    boolean existsByCnie(String cnie);
    boolean existsByEmail(String email);
}
```

#### Rôle
Accès à la persistance.

#### Méthodes importantes
- `findByCnie(...)`
- `existsByCnie(...)`
- `existsByEmail(...)`

Spring Data JPA génère ces requêtes automatiquement à partir du nom des méthodes.

---

### Fichier : `services/StudentService.java`

```java
@Service
public class StudentService {

    private final StudentRepository repository;

    public StudentService(StudentRepository repository) {
        this.repository = repository;
    }

    public List<Student> getAllStudents() {
        return repository.findAll();
    }

    public Student getStudentById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + id));
    }

    public Student getStudentByCnie(String cnie) {
        return repository.findByCnie(cnie)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with CNIE: " + cnie));
    }

    public Student createStudent(Student student) {
        if (repository.existsByCnie(student.getCnie())) {
            throw new IllegalArgumentException("CNIE already exists");
        }

        if (repository.existsByEmail(student.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        student.setCnie(student.getCnie().toUpperCase());
        return repository.save(student);
    }

    public Student updateStudent(Long id, Student newStudent) {
        Student existingStudent = getStudentById(id);

        existingStudent.setCnie(newStudent.getCnie().toUpperCase());
        existingStudent.setFirstName(newStudent.getFirstName());
        existingStudent.setLastName(newStudent.getLastName());
        existingStudent.setEmail(newStudent.getEmail());

        return repository.save(existingStudent);
    }

    public void deleteStudent(Long id) {
        Student student = getStudentById(id);
        repository.delete(student);
    }
}
```

#### Analyse méthode par méthode

##### `getAllStudents()`
- renvoie tous les étudiants.
- délègue directement à `repository.findAll()`.

##### `getStudentById(Long id)`
- cherche un étudiant par identifiant.
- si non trouvé, lance `ResourceNotFoundException`.

##### `getStudentByCnie(String cnie)`
- même logique, mais avec le CNIE.

##### `createStudent(Student student)`
Déroulement :
1. vérifie si le CNIE existe déjà.
2. vérifie si l’email existe déjà.
3. met le CNIE en majuscules.
4. sauvegarde l’entité.

##### `updateStudent(Long id, Student newStudent)`
1. récupère l’étudiant existant.
2. remplace les champs.
3. sauvegarde.

##### `deleteStudent(Long id)`
1. récupère l’étudiant.
2. supprime l’entité.

---

### Fichier : `controllers/StudentController.java`

```java
@RestController
@RequestMapping("/api/students")
public class StudentController {

    private final StudentService service;

    public StudentController(StudentService service) {
        this.service = service;
    }

    @GetMapping
    public List<Student> getAllStudents() { ... }

    @GetMapping("/{id}")
    public Student getStudentById(@PathVariable Long id) { ... }

    @GetMapping("/cnie/{cnie}")
    public Student getStudentByCnie(@PathVariable String cnie) { ... }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Student createStudent(@Valid @RequestBody Student student) { ... }

    @PutMapping("/{id}")
    public Student updateStudent(@PathVariable Long id, @Valid @RequestBody Student student) { ... }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteStudent(@PathVariable Long id) { ... }
}
```

#### Rôle
Expose l’API REST des étudiants.

#### Explication des méthodes
- `GET /api/students` : liste complète.
- `GET /api/students/{id}` : consultation par ID.
- `GET /api/students/cnie/{cnie}` : consultation par CNIE.
- `POST /api/students` : création.
- `PUT /api/students/{id}` : mise à jour.
- `DELETE /api/students/{id}` : suppression.

#### Validation
`@Valid` déclenche la validation des contraintes de l’entité `Student`.

---

### Fichier : `exceptions/ResourceNotFoundException.java`

```java
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
```

#### Rôle
Exception métier simple pour les ressources absentes.

---

### Fichier : `exceptions/GlobalExceptionHandler.java`

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
    ...
}
```

#### Rôle
Uniformiser les réponses d’erreur JSON.

#### Cas gérés
- `ResourceNotFoundException` -> `404`
- `IllegalArgumentException` -> `409`
- `MethodArgumentNotValidException` -> `400`

#### Structure des réponses
Les erreurs contiennent :
- `timestamp`
- `status`
- `error`
- `message` ou `fields`

---

## 4.4 Configuration du module

### `student-service/src/main/resources/application.properties`

```properties
spring.application.name=student-service
server.port=8081

spring.datasource.url=jdbc:mysql://localhost:3306/student_db?createDatabaseIfNotExist=true
spring.datasource.username=root
spring.datasource.password=

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

eureka.client.service-url.defaultZone=http://localhost:8761/eureka/
```

#### Explication
- `spring.application.name=student-service`
  - nom logique dans Eureka.
- `server.port=8081`
  - port du service.
- `spring.datasource.url=...student_db...`
  - connexion MySQL.
- `createDatabaseIfNotExist=true`
  - crée la base si elle n’existe pas.
- `spring.jpa.hibernate.ddl-auto=update`
  - Hibernate adapte le schéma.
- `show-sql=true`
  - affiche les requêtes SQL.
- `format_sql=true`
  - rend le SQL lisible.
- `defaultZone`
  - enregistrement auprès d’Eureka.

---

## 4.5 Architecture Spring du module

### Controller
`StudentController`

### Service
`StudentService`

### Repository
`StudentRepository`

### Entity
`Student`

### DTO
Aucun DTO dédié : le service expose l’entité directement.

### Config
`DataInitializer`

### Exception
- `ResourceNotFoundException`
- `GlobalExceptionHandler`

### Client WebClient
Aucun

### Filter
Aucun

### Security
Aucune sécurité définie

---

## 4.6 Analyse des annotations utilisées

- `@Entity`
- `@Table`
- `@Id`
- `@GeneratedValue`
- `@Column`
- `@NotBlank`
- `@Email`
- `@RestController`
- `@RequestMapping`
- `@GetMapping`
- `@PostMapping`
- `@PutMapping`
- `@DeleteMapping`
- `@ResponseStatus`
- `@RequestBody`
- `@PathVariable`
- `@Valid`
- `@RestControllerAdvice`
- `@ExceptionHandler`
- `@Configuration`
- `@Bean`
- `@Service`

---

## 4.7 Scénarios métier importants

### 4.7.1 Création d’un étudiant
1. Le front ou un client appelle `POST /api/students`.
2. Le controller reçoit le JSON.
3. `@Valid` contrôle les champs.
4. `StudentService.createStudent()` vérifie le CNIE et l’email.
5. L’étudiant est enregistré en base.
6. Le JSON de l’étudiant est renvoyé.

### 4.7.2 Recherche d’un étudiant par CNIE
1. Requête `GET /api/students/cnie/CD2387`.
2. Le CNIE est converti en majuscules.
3. Le repository cherche dans la base.
4. Si l’étudiant existe, il est renvoyé.
5. Sinon, une exception 404 est retournée.

### 4.7.3 Suppression
1. `DELETE /api/students/{id}`.
2. Recherche de l’étudiant.
3. Suppression.
4. Réponse `204 No Content`.

---

## 4.8 Questions possibles du professeur

**Question : Pourquoi utiliser `IllegalArgumentException` pour les doublons ?**  
**Réponse :** Le service choisit une exception simple pour signaler une contrainte métier violée. Elle est ensuite convertie en réponse HTTP `409 Conflict` par le handler global.

**Question : Pourquoi mettre le CNIE en majuscules ?**  
**Réponse :** Pour normaliser la saisie et éviter qu’`ab1234` et `AB1234` soient traités comme deux identifiants différents.

**Question : Pourquoi exposer l’entité directement ici ?**  
**Réponse :** C’est un choix simple pour un projet pédagogique. Dans un projet plus avancé, on préférerait souvent des DTO pour éviter d’exposer la structure interne.

**Question : Que fait `findByCnie` ?**  
**Réponse :** Spring Data JPA génère automatiquement la requête SQL à partir du nom de la méthode.

---

## 4.9 Ce qu’il faut absolument retenir

- Le Student Service centralise la gestion des étudiants.
- Il impose unicité CNIE et email.
- Il fournit des endpoints REST simples et validés.

### Réponse courte pour l’oral
Le Student Service est le microservice responsable de l’entité étudiant. Il offre les opérations CRUD, vérifie l’unicité du CNIE et de l’email, et expose une API consommée par le Gateway et par le service d’inscription.

---

# 5. Module : Course Service

## 5.1 Présentation générale

### Rôle du module
Le Course Service gère les cours :
- création,
- lecture,
- mise à jour,
- suppression,
- alimentation initiale de cours de démonstration.

### Pourquoi ce module existe-t-il ?
Il sépare les informations pédagogiques des étudiants et des inscriptions.

### Problème résolu
Il permet de traiter le catalogue des cours indépendamment des inscriptions.

### Sans ce module
Le service d’inscription devrait stocker et gérer lui-même toutes les données de cours.

---

## 5.2 Fonctionnement interne

### Démarrage
1. Spring Boot démarre.
2. JPA se connecte à `course_db`.
3. `DataInitializer` insère des cours si la table est vide.
4. Le service s’enregistre dans Eureka.

### Composants Spring utilisés
- `@SpringBootApplication`
- `@RestController`
- `@Service`
- `@Repository`
- `@Entity`
- `@Table`
- `@Configuration`
- `CommandLineRunner`

### Flux de données
Même logique que Student Service :
Controller -> Service -> Repository -> MySQL -> réponse JSON.

---

## 5.3 Analyse du code

### Fichier : `CourseServiceApplication.java`
Démarrage standard Spring Boot.

### Fichier : `config/DataInitializer.java`

Le `DataInitializer` insère des exemples de cours comme :
- Spring Framework
- Data Mining
- Cloud Computing
- Software Architecture
- Web Development

#### Rôle métier
Donner une base de données de démonstration immédiatement exploitable.

---

### Fichier : `entities/Course.java`

```java
@Entity
@Table(name = "courses")
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Course title is required")
    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @Min(value = 1, message = "Credits must be greater than 0")
    @Column(nullable = false)
    private int credits;
}
```

#### Rôle
Représente un cours.

#### Attributs
- `id`
- `title`
- `description`
- `credits`

#### Contraintes
- titre obligatoire ;
- crédits > 0.

---

### Fichier : `repositories/CourseRepository.java`

```java
public interface CourseRepository extends JpaRepository<Course, Long> {
}
```

#### Rôle
Repository standard sans méthodes personnalisées.

---

### Fichier : `services/CourseService.java`

```java
@Service
public class CourseService {
    private final CourseRepository repository;

    public List<Course> getAllCourses() { ... }
    public Course getCourseById(Long id) { ... }
    public Course createCourse(Course course) { ... }
    public Course updateCourse(Long id, Course newCourse) { ... }
    public void deleteCourse(Long id) { ... }
}
```

#### Analyse
- `getAllCourses()` : liste tout le catalogue.
- `getCourseById()` : renvoie un cours ou une exception 404.
- `createCourse()` : sauvegarde un cours.
- `updateCourse()` : modifie titre, description et crédits.
- `deleteCourse()` : supprime après vérification de l’existence.

---

### Fichier : `controllers/CourseController.java`

Endpoints :
- `GET /api/courses`
- `GET /api/courses/{id}`
- `POST /api/courses`
- `PUT /api/courses/{id}`
- `DELETE /api/courses/{id}`

Le fonctionnement est identique à celui du Student Service.

---

### Fichier : `exceptions/ResourceNotFoundException.java`
Exception métier simple pour un cours absent.

---

### Fichier : `exceptions/GlobalExceptionHandler.java`
Gestion de :
- 404 pour ressource absente,
- 400 pour validation.

---

## 5.4 Configuration du module

### `course-service/src/main/resources/application.properties`

```properties
spring.application.name=course-service
server.port=8082

spring.datasource.url=jdbc:mysql://localhost:3306/course_db?createDatabaseIfNotExist=true
spring.datasource.username=root
spring.datasource.password=

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

eureka.client.service-url.defaultZone=http://localhost:8761/eureka/
```

#### Analyse
Le service utilise sa propre base `course_db` et son propre port `8082`.

---

## 5.5 Architecture Spring du module

### Controller
`CourseController`

### Service
`CourseService`

### Repository
`CourseRepository`

### Entity
`Course`

### DTO
Aucun DTO dédié.

### Config
`DataInitializer`

### Exception
`ResourceNotFoundException`, `GlobalExceptionHandler`

### Client WebClient
Aucun

### Filter
Aucun

### Security
Aucune

---

## 5.6 Analyse des annotations utilisées

- `@Entity`
- `@Table`
- `@Id`
- `@GeneratedValue`
- `@Column`
- `@NotBlank`
- `@Min`
- `@RestController`
- `@RequestMapping`
- `@GetMapping`
- `@PostMapping`
- `@PutMapping`
- `@DeleteMapping`
- `@ResponseStatus`
- `@RequestBody`
- `@PathVariable`
- `@Valid`
- `@RestControllerAdvice`
- `@ExceptionHandler`
- `@Configuration`
- `@Bean`
- `@Service`

---

## 5.7 Scénarios métier

### Création d’un cours
1. Requête `POST /api/courses`.
2. Validation du titre et des crédits.
3. Sauvegarde en base.
4. Retour de l’objet créé.

### Consultation d’un cours
1. Requête `GET /api/courses/{id}`.
2. Recherche par ID.
3. Si absent, 404.

---

## 5.8 Questions possibles du professeur

**Question : Pourquoi séparer Student et Course dans deux microservices ?**  
**Réponse :** Parce que ce sont deux domaines métier différents. Cela simplifie le code, permet des déploiements indépendants et évite un service monolithique trop chargé.

**Question : Pourquoi le Course Service n’a pas de DTO ?**  
**Réponse :** Dans ce projet, le service expose directement l’entité pour rester simple. Le projet montre cependant que l’usage des DTO est plus avancé dans Enrollment Service.

---

## 5.9 Ce qu’il faut absolument retenir

- Le Course Service gère le catalogue.
- Il possède sa propre base MySQL.
- Il expose des endpoints REST CRUD.

### Réponse courte pour l’oral
Le Course Service est le microservice dédié aux cours. Il permet de créer, consulter, modifier et supprimer les cours, tout en gardant sa base de données séparée du reste du système.

---

# 6. Module : Enrollment Service

## 6.1 Présentation générale

### Rôle du module
Le Enrollment Service gère la logique métier la plus importante :
- inscrire un étudiant à un cours,
- lister ses inscriptions,
- annuler une inscription,
- compter le nombre d’inscrits à un cours.

### Pourquoi ce module existe-t-il ?
L’inscription est une relation métier entre étudiant et cours.  
Cette relation mérite un service dédié, car elle porte de la logique métier complexe.

### Problèmes résolus
- empêcher les doublons,
- limiter la capacité,
- vérifier l’existence du student et du course,
- gérer une fenêtre d’annulation de 24h.

### Sans ce module
Les règles d’inscription seraient dispersées dans plusieurs services.

---

## 6.2 Fonctionnement interne

### Démarrage
1. Spring Boot démarre le service.
2. JPA se connecte à `enrollment_db`.
3. `WebClientConfig` crée un `WebClient.Builder` load-balanced.
4. Le service s’enregistre dans Eureka.
5. `EnrollmentService` et `EnrollmentController` sont prêts à répondre.

### Composants Spring utilisés
- `@SpringBootApplication`
- `@Service`
- `@RestController`
- `@Entity`
- `@Table`
- `@RestControllerAdvice`
- `@Configuration`
- `@Bean`
- `@LoadBalanced`
- `WebClient`
- `JpaRepository`
- Validation Jakarta

### Interactions avec les autres services
- `StudentClient` appelle `student-service`.
- `CourseClient` appelle `course-service`.
- `EnrollmentService` combine les résultats.

### Flux de données
1. Le front envoie une action d’inscription.
2. Le controller reçoit la requête.
3. Le service appelle Student Service et Course Service.
4. Le service vérifie les règles.
5. Le repository persiste l’inscription.
6. Le service renvoie un DTO de réponse.

---

## 6.3 Analyse du code

### Fichier : `EnrollmentServiceApplication.java`
Point d’entrée standard Spring Boot.

---

### Fichier : `config/WebClientConfig.java`

```java
@Configuration
public class WebClientConfig {

    @Bean
    @LoadBalanced
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }
}
```

#### Rôle
Fournir un `WebClient.Builder` utilisable dans l’application.

#### Pourquoi `@LoadBalanced` ?
Pour permettre à `WebClient` de résoudre les noms logiques des services via Eureka, par exemple :
- `http://student-service`
- `http://course-service`

#### Ce que cela apporte
Le service n’utilise pas des URL IP/port statiques.  
Il peut appeler des services enregistrés dynamiquement.

---

### Fichier : `clients/StudentClient.java`

```java
@Component
public class StudentClient {

    private final WebClient webClient;

    public StudentClient(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder
                .baseUrl("http://student-service")
                .build();
    }

    public StudentDTO findByCnie(String cnie) {
        return webClient.get()
                .uri("/api/students/cnie/{cnie}", cnie)
                .retrieve()
                .onStatus(
                        status -> status.value() == 404,
                        response -> Mono.error(new StudentNotFoundException("Student not found with CNIE: " + cnie))
                )
                .bodyToMono(StudentDTO.class)
                .block();
    }
}
```

#### Rôle
Interroger le Student Service.

#### Déroulement
1. construit un client Web avec la base URL du service ;
2. effectue un `GET /api/students/cnie/{cnie}` ;
3. si l’API répond `404`, transforme l’erreur en `StudentNotFoundException` ;
4. convertit la réponse JSON en `StudentDTO` ;
5. bloque le flux réactif avec `.block()` pour obtenir un objet synchrone.

#### Pourquoi un DTO ?
Pour récupérer seulement les champs utiles de l’étudiant.

---

### Fichier : `clients/CourseClient.java`
Même principe que `StudentClient`, mais pour `course-service`.

```java
.baseUrl("http://course-service")
```

et appel :
```java
GET /api/courses/{id}
```

---

### Fichier : `dtos/StudentDTO.java`
Contient :
- `id`
- `cnie`
- `firstName`
- `lastName`
- `email`

### Fichier : `dtos/CourseDTO.java`
Contient :
- `id`
- `title`
- `description`
- `credits`

### Fichier : `dtos/EnrollmentRequest.java`

```java
@NotBlank(message = "CNIE is required")
private String studentCnie;

@NotNull(message = "Course ID is required")
@Positive(message = "Course ID must be positive")
private Long courseId;
```

#### Rôle
Modèle de la requête d’inscription.

#### Pourquoi un DTO d’entrée ?
Pour ne recevoir que ce qui est nécessaire :
- CNIE,
- ID du cours.

---

### Fichier : `dtos/EnrollmentResponseDTO.java`
Retourne :
- `enrollmentId`
- `studentCnie`
- `courseName`
- `date`
- `deletable`

#### Rôle
Formater la réponse envoyée au front-end avec des informations lisibles.

---

### Fichier : `entities/Enrollment.java`

```java
@Entity
@Table(
        name = "enrollments",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"student_id", "course_id"})
        }
)
public class Enrollment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "course_id", nullable = false)
    private Long courseId;

    @Column(name = "enrollment_date", nullable = false)
    private LocalDateTime enrollmentDate;
}
```

#### Rôle
Représente une inscription.

#### Attributs
- `id`
- `studentId`
- `courseId`
- `enrollmentDate`

#### Contrainte clé
L’unicité `(student_id, course_id)` empêche un étudiant de s’inscrire deux fois au même cours.

---

### Fichier : `repositories/EnrollmentRepository.java`

```java
public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {
    List<Enrollment> findByStudentId(Long studentId);
    long countByCourseId(Long courseId);
    boolean existsByStudentIdAndCourseId(Long studentId, Long courseId);
}
```

#### Rôle
Accès aux inscriptions.

#### Méthodes importantes
- `findByStudentId`
- `countByCourseId`
- `existsByStudentIdAndCourseId`

Ces méthodes traduisent directement les besoins métier.

---

### Fichier : `services/EnrollmentService.java`

```java
@Service
public class EnrollmentService {
    private static final int MAX_STUDENTS_PER_COURSE = 3;
    ...
}
```

#### Rôle
C’est le cœur métier du module.

---

#### Méthode : `enrollStudent(EnrollmentRequest request)`

Déroulement détaillé :

1. `String cnie = request.getStudentCnie().toUpperCase();`
   - normalise le CNIE.

2. `StudentDTO student = studentClient.findByCnie(cnie);`
   - vérifie que l’étudiant existe.

3. `CourseDTO course = courseClient.findById(request.getCourseId());`
   - vérifie que le cours existe.

4. `repository.existsByStudentIdAndCourseId(...)`
   - vérifie la double inscription.

5. Si déjà inscrit :
   - `AlreadyEnrolledException`.

6. `repository.countByCourseId(course.getId());`
   - calcule la capacité occupée.

7. Si la limite est atteinte :
   - `CourseFullException`.

8. Création d’un `Enrollment`.
   - `studentId`, `courseId`, `enrollmentDate = now`.

9. `repository.save(enrollment);`
   - sauvegarde.

10. `toResponseDTO(...)`
   - construit une réponse propre pour le front.

---

#### Méthode : `getMyEnrollments(String cnie)`

1. recherche l’étudiant via `StudentClient`.
2. récupère toutes ses inscriptions.
3. pour chaque inscription, récupère le cours correspondant.
4. transforme chaque inscription en `EnrollmentResponseDTO`.

#### Pourquoi cette méthode est importante ?
Elle montre la collaboration entre plusieurs microservices pour construire une vue métier complète.

---

#### Méthode : `cancelEnrollment(Long enrollmentId, String cnie)`

1. récupère l’étudiant.
2. cherche l’inscription par ID.
3. vérifie que l’inscription appartient bien à cet étudiant.
4. vérifie la fenêtre de 24h.
5. supprime l’inscription.

#### Règles métiers
- un étudiant ne peut pas annuler l’inscription d’un autre ;
- une annulation tardive est interdite.

---

#### Méthode : `countEnrollmentsByCourse(Long courseId)`

1. vérifie que le cours existe via `courseClient.findById(courseId)`.
2. renvoie le nombre d’inscriptions du cours.

---

#### Méthodes privées importantes

##### `toResponseDTO(...)`
Transforme l’entité technique en objet de sortie simple.

##### `isDeletable(LocalDateTime enrollmentDate)`
Retourne `true` si l’inscription a moins de 24 heures.

---

### Fichier : `controllers/EnrollmentController.java`

Endpoints :
- `POST /api/enrollments`
- `GET /api/enrollments/me?cnie=...`
- `DELETE /api/enrollments/{id}?cnie=...`
- `GET /api/enrollments/course/{courseId}/count`

#### Analyse
Le controller ne contient presque pas de logique métier.  
Il délègue tout à `EnrollmentService`.

---

### Fichier : `exceptions/*`

Le module définit plusieurs exceptions spécialisées :

- `StudentNotFoundException`
- `CourseNotFoundException`
- `EnrollmentNotFoundException`
- `AlreadyEnrolledException`
- `CourseFullException`
- `CancellationExpiredException`
- `ForbiddenActionException`

#### Rôle
Chaque exception représente une règle métier cassée.

---

### Fichier : `exceptions/GlobalExceptionHandler.java`

Ce handler est plus riche que dans les autres services.

#### Cas gérés
- `StudentNotFoundException` -> `404`
- `CourseNotFoundException` -> `404`
- `EnrollmentNotFoundException` -> `404`
- `CourseFullException` -> `409`
- `AlreadyEnrolledException` -> `409`
- `CancellationExpiredException` -> `403`
- `ForbiddenActionException` -> `403`
- `WebClientRequestException` -> `503`
- `MethodArgumentNotValidException` -> `400`

#### Pourquoi c’est important ?
Parce que ce service appelle d’autres microservices.  
Il doit donc gérer à la fois :
- les erreurs métier locales,
- les erreurs de communication réseau,
- les erreurs de validation.

---

## 6.4 Configuration du module

### `enrollment-service/src/main/resources/application.properties`

```properties
spring.application.name=enrollment-service
server.port=8083

spring.datasource.url=jdbc:mysql://localhost:3306/enrollment_db?createDatabaseIfNotExist=true
spring.datasource.username=root
spring.datasource.password=

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

eureka.client.service-url.defaultZone=http://localhost:8761/eureka/
```

#### Explication
- service name : `enrollment-service`
- port : `8083`
- base MySQL : `enrollment_db`
- auto-update Hibernate : `update`
- enregistrement Eureka : oui

---

## 6.5 Architecture Spring du module

### Controller
`EnrollmentController`

### Service
`EnrollmentService`

### Repository
`EnrollmentRepository`

### Entity
`Enrollment`

### DTO
- `EnrollmentRequest`
- `EnrollmentResponseDTO`
- `StudentDTO`
- `CourseDTO`

### Config
- `WebClientConfig`

### Exception
- exceptions métier multiples
- `GlobalExceptionHandler`

### Client WebClient
- `StudentClient`
- `CourseClient`

### Filter
Aucun filtre métier spécifique

### Security
Aucune sécurité définie

---

## 6.6 Analyse des annotations utilisées

- `@Component`
- `@Service`
- `@Configuration`
- `@Bean`
- `@LoadBalanced`
- `@RestController`
- `@RequestMapping`
- `@PostMapping`
- `@GetMapping`
- `@DeleteMapping`
- `@ResponseStatus`
- `@RequestBody`
- `@RequestParam`
- `@PathVariable`
- `@Valid`
- `@Entity`
- `@Table`
- `@Id`
- `@GeneratedValue`
- `@Column`
- `@NotBlank`
- `@NotNull`
- `@Positive`
- `@RestControllerAdvice`
- `@ExceptionHandler`

---

## 6.7 Scénarios métier détaillés

### 6.7.1 Inscription d’un étudiant

```text
Front-end
  -> Gateway
  -> EnrollmentController
  -> EnrollmentService
  -> StudentClient (student-service)
  -> CourseClient (course-service)
  -> EnrollmentRepository
  -> MySQL
  -> JSON réponse
```

Étapes :
1. Le front envoie `POST /api/enrollments`.
2. Le Gateway route la requête vers le Enrollment Service.
3. Le controller valide le body.
4. Le service récupère l’étudiant.
5. Le service récupère le cours.
6. Le service vérifie les doublons.
7. Le service vérifie la capacité.
8. Le service enregistre l’inscription.
9. Le service retourne un DTO de réponse.

---

### 6.7.2 Consultation de mes inscriptions
1. Le front appelle `GET /api/enrollments/me?cnie=AB1234`.
2. Le service retrouve l’étudiant.
3. Il récupère toutes ses inscriptions.
4. Il enrichit chaque inscription avec le titre du cours.
5. Il renvoie une liste lisible.

---

### 6.7.3 Annulation d’une inscription
1. Le front appelle `DELETE /api/enrollments/{id}?cnie=...`.
2. Le service vérifie le propriétaire.
3. Le service vérifie la fenêtre de 24h.
4. Si autorisé, suppression.
5. Sinon, erreur 403.

---

### 6.7.4 Comptage des places occupées
1. Le front ou le service demande `GET /api/enrollments/course/{courseId}/count`.
2. Le service vérifie que le cours existe.
3. Il renvoie le nombre d’inscriptions.

---

## 6.8 Questions possibles du professeur

**Question : Pourquoi utiliser WebClient au lieu de RestTemplate ?**  
**Réponse :** WebClient est plus moderne, compatible avec le style réactif, et mieux adapté à des appels non bloquants. Dans ce projet, on utilise quand même `.block()` pour rester simple, mais l’API de WebClient reste préférable dans un contexte moderne.

**Question : Pourquoi avoir des DTO ?**  
**Réponse :** Les DTO permettent de contrôler les données échangées, de ne pas exposer directement les entités internes et de simplifier les réponses front-end.

**Question : Pourquoi une capacité maximale de 3 étudiants par cours ?**  
**Réponse :** C’est une règle métier définie dans le projet via `MAX_STUDENTS_PER_COURSE = 3`. Elle simule une contrainte réelle de capacité.

**Question : Comment empêcher une double inscription ?**  
**Réponse :** Par la méthode `existsByStudentIdAndCourseId` et par la contrainte unique dans la table `enrollments`.

**Question : Pourquoi vérifier d’abord l’existence du student et du course ?**  
**Réponse :** Pour éviter de créer une inscription incohérente avec des identifiants inexistants.

**Question : Pourquoi l’annulation est-elle limitée à 24h ?**  
**Réponse :** Pour modéliser une règle métier. La méthode `isDeletable()` calcule cette fenêtre en comparant la date d’inscription avec l’heure actuelle.

---

## 6.9 Ce qu’il faut absolument retenir

- L’Enrollment Service orchestre la logique métier.
- Il communique avec Student et Course Service.
- Il applique des règles fortes : doublon, capacité, annulation 24h.

### Réponse courte pour l’oral
Le Enrollment Service est le cœur métier du projet. Il s’occupe d’inscrire un étudiant à un cours, de vérifier la disponibilité, d’empêcher les doublons et de contrôler l’annulation dans une fenêtre de 24 heures.

---

# 7. Module : Dashboard Frontend

## 7.1 Présentation générale

### Rôle du module
Le Dashboard Frontend est l’interface utilisateur du système.

### Pourquoi ce module existe-t-il ?
Pour offrir un point d’accès simple, visuel et interactif aux fonctionnalités du backend.

### Problème résolu
Sans interface :
- l’utilisateur devrait tester l’API manuellement ;
- l’expérience serait moins intuitive ;
- les relations entre services seraient difficiles à visualiser.

### Sans ce module
Le système resterait techniquement fonctionnel, mais peu démonstratif pour une soutenance.

---

## 7.2 Fonctionnement interne

### Technologies utilisées
- HTML
- CSS
- JavaScript
- Chart.js
- Lucide icons

### Architecture
Ce n’est pas une application React ou Angular.  
C’est une page statique avec :
- une zone d’accès,
- un dashboard,
- des cartes,
- des graphiques,
- des modales,
- des notifications.

### Démarrage
1. La page charge `index.html`.
2. Le CSS est appliqué.
3. Le JS initialise l’état.
4. Les icônes Lucide sont chargées.
5. Chart.js est prêt.
6. Le front lit le CNIE sauvegardé dans `localStorage`.
7. L’utilisateur saisit son CNIE.
8. Le front appelle l’API Gateway.

---

## 7.3 Analyse du code

### Fichier : `index.html`

#### Structure générale
Le HTML contient :

- une **access screen** pour saisir le CNIE,
- une **dashboard screen** masquée au départ,
- une **sidebar** de navigation,
- un **topbar**,
- une section **overview**,
- une section **enrollments**,
- une section **catalog**,
- une section **analytics**,
- une **modal** d’annulation,
- un conteneur de **toasts**.

#### IDs importants
Le fichier fournit notamment :
- `access-screen`
- `dashboard-screen`
- `cnie-form`
- `cnie-input`
- `topbar-name`
- `profile-card`
- `stats-grid`
- `enrollments-container`
- `courses-grid`
- `line-chart`
- `doughnut-chart`
- `bar-chart`
- `radar-chart`
- `modal-backdrop`
- `toast-container`

#### Rôle de ces IDs
Le fichier JavaScript s’appuie sur ces IDs pour manipuler le DOM.

---

### Fichier : `app.js`

#### Vue d’ensemble
Le fichier JavaScript est le cerveau du front-end.

Il gère :
- l’état global,
- les appels API,
- le rendu des données,
- les graphiques,
- les modales,
- les notifications,
- le stockage local,
- les actions de l’utilisateur.

---

### Variables importantes

#### `API_BASE = "http://localhost:8080"`
Le front communique avec le Gateway.

#### `MAX_PER_COURSE = 3`
Même capacité que dans le backend d’inscription.

#### `STORAGE_KEY = "enrollhub-cnie"`
Le CNIE est sauvegardé localement.

#### `state`
Objet central qui contient :
- `currentCnie`
- `student`
- `courses`
- `enrollments`
- `courseCounts`
- `charts`
- `pendingCancel`
- `isInitialLoad`

---

### Fonction : `apiFetch(endpoint, options = {})`

#### Rôle
Centraliser tous les appels HTTP.

#### Ce qu’elle fait
1. construit l’URL complète ;
2. prépare les headers ;
3. transforme le body en JSON si nécessaire ;
4. envoie la requête ;
5. lit le JSON de réponse ;
6. convertit les erreurs HTTP en erreurs JavaScript lisibles.

#### Intérêt
Toutes les requêtes passent par le même mécanisme, ce qui simplifie la maintenance.

---

### Fonction : `loadStudentByCnie(cnie)`
Appelle :
```javascript
/api/students/cnie/{cnie}
```

### Fonction : `loadCourses()`
Appelle :
```javascript
/api/courses
```

### Fonction : `loadEnrollments(cnie)`
Appelle :
```javascript
/api/enrollments/me?cnie=...
```

### Fonction : `loadCourseCounts()`
Récupère le nombre d’inscriptions pour chaque cours.

### Fonction : `enrollStudent(cnie, courseId)`
Envoie :
```javascript
POST /api/enrollments
```

### Fonction : `cancelEnrollment(id)`
Envoie :
```javascript
DELETE /api/enrollments/{id}?cnie=...
```

---

### Fonction : `initializeDashboard(cnie)`

#### Rôle
Initialise la session de l’étudiant.

#### Déroulement
1. active le mode chargement ;
2. nettoie le message d’erreur ;
3. stocke le CNIE courant ;
4. charge l’étudiant via l’API ;
5. sauvegarde le CNIE dans `localStorage`;
6. affiche le dashboard ;
7. charge cours et inscriptions ;
8. affiche une notification de succès.

#### En cas d’erreur
- le CNIE est supprimé ;
- l’erreur est affichée dans l’interface.

---

### Fonction : `refreshDashboardData(showSuccessToast = false)`

#### Rôle
Rafraîchir toutes les données visibles.

#### Étapes
1. active le chargement ;
2. appelle les cours et les inscriptions en parallèle ;
3. charge les compteurs ;
4. relance le rendu complet ;
5. affiche éventuellement un toast ;
6. désactive le chargement.

---

### Fonction : `renderAll()`

Elle orchestre le rendu de :
- topbar,
- profil,
- statistiques,
- inscriptions,
- catalogue,
- graphiques,
- dernière synchronisation,
- jauge circulaire.

#### C’est la fonction de réaffichage complète.

---

### Fonction : `renderTopbar()`
Affiche :
- le nom de l’étudiant,
- les initiales,
- le CNIE.

### Fonction : `renderProfileCard()`
Construit une carte profil enrichie :
- nom complet,
- email,
- statut,
- CNIE,
- nombre d’inscriptions.

### Fonction : `renderStats()`
Affiche les cartes :
- cours inscrits,
- cours disponibles,
- cours complets,
- inscriptions annulables.

### Fonction : `renderEnrollments()`
Affiche la liste des inscriptions avec :
- titre du cours,
- date,
- statut,
- temps restant,
- bouton annuler.

### Fonction : `renderCourses()`
Affiche le catalogue des cours avec :
- titre,
- description,
- crédits,
- progression,
- nombre de places restantes,
- bouton d’inscription.

### Fonction : `renderCharts()`
Affiche les 4 graphiques :
- line chart,
- doughnut chart,
- bar chart,
- radar chart.

---

## 7.4 Logique métier du front-end

### Contrôle de capacité
Le front reproduit la contrainte du backend :
```javascript
const MAX_PER_COURSE = 3;
```

### Gestion de l’état
Le front garde une copie locale de :
- l’étudiant,
- les cours,
- les inscriptions,
- les compteurs de places.

### Gestion des erreurs
La fonction `humanizeError()` traduit les erreurs techniques en messages compréhensibles.

Exemples :
- `Failed to fetch` -> problème de connexion au Gateway
- `Student not found`
- `Course capacity reached`
- `Student already enrolled in this course`
- `Cancellation period expired`

### Gestion de l’annulation
Le front ouvre une modale, puis confirme l’annulation avant d’appeler l’API.

### Gestion de `localStorage`
Le CNIE est conservé entre deux chargements de la page.

---

## 7.5 Analyse du CSS (`styles.css`)

### Rôle
Le CSS donne au dashboard son aspect moderne.

### Points clés
- variables CSS dans `:root`,
- thème sombre,
- cartes avec effet glassmorphism,
- responsive design,
- sidebar adaptative,
- toasts animés,
- skeleton loaders,
- composants visuels cohérents.

### Ce qu’il faut comprendre
Le CSS n’est pas seulement décoratif : il structure aussi l’expérience utilisateur et la lisibilité du dashboard.

---

## 7.6 Communication entre frontend et backend

```text
Navigateur
  -> API Gateway :8080
  -> Student Service :8081
  -> Course Service :8082
  -> Enrollment Service :8083
```

Le front ne parle jamais directement aux microservices.  
Il passe toujours par le Gateway.

---

## 7.7 Questions possibles du professeur

**Question : Pourquoi ne pas utiliser React ?**  
**Réponse :** Ce projet a été réalisé en HTML/CSS/JavaScript pur, ce qui suffit pour démontrer la logique microservices et garder l’interface simple à comprendre.

**Question : Pourquoi stocker le CNIE dans `localStorage` ?**  
**Réponse :** Pour simplifier l’expérience utilisateur et éviter de ressaisir le CNIE à chaque recharge.

**Question : Pourquoi utiliser Chart.js ?**  
**Réponse :** Pour visualiser les données métier de manière claire et parlante pendant la démonstration.

**Question : Pourquoi le front appelle-t-il uniquement le Gateway ?**  
**Réponse :** Pour centraliser les accès, simplifier la configuration réseau et éviter d’exposer les services internes au navigateur.

---

## 7.8 Ce qu’il faut absolument retenir

- Le front est une interface statique riche.
- Il consomme uniquement le Gateway.
- Il orchestre l’expérience utilisateur autour du CNIE.

### Réponse courte pour l’oral
Le Dashboard Frontend est une interface HTML/CSS/JavaScript qui permet à l’utilisateur de saisir son CNIE, de voir ses cours, de s’inscrire, d’annuler et de visualiser ses données sous forme de tableaux et graphiques.

---

# 8. Analyse transversale des architectures Spring

## 8.1 Rôle des couches dans les microservices

### Controller
Reçoit la requête HTTP et renvoie la réponse HTTP.

### Service
Contient les règles métier.

### Repository
Parle à la base de données.

### Entity
Représente une table SQL et un objet métier.

### DTO
Contrôle les données échangées entre systèmes.

### Config
Configure Spring, la base de données, les clients, les filtres.

### Exception
Uniformise les erreurs métier.

### Client WebClient
Permet aux microservices de communiquer entre eux.

### Filter
Intercepte les requêtes pour des règles transversales, ici CORS.

### Security
Dans ce projet, il n’y a pas de couche de sécurité dédiée.

---

## 8.2 Cycle de vie d’une requête

```text
HTTP Request
   -> Controller
   -> Service
   -> Repository / WebClient
   -> DB / autre microservice
   -> DTO / Entity
   -> Response HTTP
```

---

## 8.3 Pourquoi les DTO sont utiles ici ?

Le projet montre clairement plusieurs cas d’usage :

- **EnrollmentRequest** : entrée utilisateur minimale.
- **EnrollmentResponseDTO** : sortie lisible pour le front.
- **StudentDTO / CourseDTO** : objets transportés entre microservices.

### Avantages
- découplage ;
- sécurité ;
- clarté ;
- stabilité de l’API.

---

## 8.4 Pourquoi WebClient est utilisé ici ?

- pour appeler d’autres services via HTTP ;
- pour travailler avec Eureka et le load balancing ;
- pour récupérer des réponses JSON ;
- pour simplifier la communication interservices.

---

## 8.5 Pourquoi pas RestTemplate ?

Dans un projet moderne, WebClient est généralement préféré :
- API plus moderne,
- compatible réactif,
- plus flexible.

Le projet reste simple en utilisant `.block()` pour garder une logique synchrone.

---

## 8.6 Pourquoi pas de Spring Security ?

Parce que le projet se concentre sur :
- l’architecture microservices,
- la communication interservices,
- la persistance,
- la gestion métier des inscriptions.

L’authentification et l’autorisation ne font pas partie de cette version.

---

# 9. Analyse des annotations rencontrées dans le projet

## 9.1 Annotations Spring Boot et Spring Cloud

### `@SpringBootApplication`
- Définit une application Spring Boot.
- Active auto-configuration + scan composants.
- Utilisée dans toutes les classes `*Application`.

### `@EnableEurekaServer`
- Active Eureka Server.
- Utilisée dans `DiscoveryServerApplication`.

### `@LoadBalanced`
- Permet la résolution de noms de services via le load balancer.
- Utilisée sur `WebClient.Builder`.

### `@Configuration`
- Déclare une classe de configuration Spring.
- Utilisée pour `DataInitializer`, `GatewayCorsConfig`, `WebClientConfig`.

### `@Bean`
- Déclare un objet géré par le conteneur Spring.

### `@Component`
- Marque un composant générique Spring.
- Utilisé pour `StudentClient` et `CourseClient`.

### `@Service`
- Signale une classe de logique métier.

### `@RestController`
- Contrôleur REST avec réponse JSON automatique.

### `@RestControllerAdvice`
- Gestion globale des exceptions pour les contrôleurs.

### `@ExceptionHandler`
- Associe une méthode à un type d’exception.

---

## 9.2 Annotations JPA

### `@Entity`
- La classe représente une table de base de données.

### `@Table`
- Permet de nommer la table et définir des contraintes.

### `@Id`
- Identifiant primaire.

### `@GeneratedValue`
- Génération automatique de l’identifiant.

### `@Column`
- Paramètre une colonne SQL.

### `@UniqueConstraint`
- Définit une contrainte d’unicité composite ou simple.

---

## 9.3 Annotations de validation

### `@NotBlank`
- Chaîne obligatoire non vide.

### `@NotNull`
- Valeur obligatoire non nulle.

### `@Positive`
- Valeur strictement positive.

### `@Min`
- Valeur minimale.

### `@Email`
- Vérifie le format e-mail.

### `@Valid`
- Déclenche la validation sur les objets reçus.

---

## 9.4 Annotations de mapping HTTP

### `@RequestMapping`
- Définit la base de l’URL du contrôleur.

### `@GetMapping`
- Route HTTP GET.

### `@PostMapping`
- Route HTTP POST.

### `@PutMapping`
- Route HTTP PUT.

### `@DeleteMapping`
- Route HTTP DELETE.

### `@RequestBody`
- Lie le corps JSON de la requête à un objet Java.

### `@PathVariable`
- Récupère une variable dans l’URL.

### `@RequestParam`
- Récupère un paramètre de requête.

### `@ResponseStatus`
- Définit le code HTTP renvoyé.

---

## 9.5 Annotations de test

### `@SpringBootTest`
- Lance le contexte complet Spring pour les tests d’intégration.

### `@Test`
- Indique une méthode de test JUnit.

---

# 10. Analyse des fichiers de configuration

## 10.1 `application.properties`
Ce projet utilise surtout `application.properties` et pas `application.yml` ni `bootstrap.yml`.

### Ce qu’il faut retenir
- `application.properties` configure :
  - le nom du service,
  - le port,
  - la base de données,
  - Eureka,
  - Hibernate.

### Absence de `application.yml`
Le projet n’utilise pas de YAML dans les fichiers analysés.

### Absence de `bootstrap.yml`
Aucune configuration de bootstrap externe n’apparaît dans ce code.

---

# 11. Base de données

## 11.1 Schéma relationnel global

```text
student_db
└── students
    ├── id (PK)
    ├── cnie (UNIQUE)
    ├── first_name
    ├── last_name
    └── email (UNIQUE)

course_db
└── courses
    ├── id (PK)
    ├── title
    ├── description
    └── credits

enrollment_db
└── enrollments
    ├── id (PK)
    ├── student_id
    ├── course_id
    └── enrollment_date
    UNIQUE(student_id, course_id)
```

## 11.2 Relations métier

### Student -> Enrollment
Un étudiant peut avoir plusieurs inscriptions.

### Course -> Enrollment
Un cours peut contenir plusieurs inscriptions.

### Enrollment
C’est la table de liaison métier entre Student et Course.

---

## 11.3 Rôle métier de chaque entité

### `Student`
Identité de l’étudiant.

### `Course`
Offre de formation / matière.

### `Enrollment`
Trace une inscription précise entre un étudiant et un cours.

---

# 12. Communication complète entre microservices

## 12.1 Découverte des services

1. Chaque microservice se déclare avec `spring.application.name`.
2. Chaque microservice client s’enregistre dans Eureka.
3. Le Gateway et Enrollment Service consultent Eureka.
4. Les appels peuvent utiliser `lb://service-name` ou `http://service-name`.

---

## 12.2 Rôle exact de chaque brique

### Eureka
Annuaire des services.

### Gateway
Point d’entrée réseau unique.

### WebClient
Client HTTP entre services.

### Load Balancer
Choisit l’instance disponible.

---

## 12.3 Flux complet d’une inscription

```text
1. Frontend saisit un CNIE et un cours
2. Requête POST vers le Gateway
3. Gateway route vers Enrollment Service
4. Enrollment Service appelle Student Service
5. Enrollment Service appelle Course Service
6. Enrollment Service vérifie doublon et capacité
7. Enrollment Service sauvegarde en base
8. Réponse DTO renvoyée au front
```

---

## 12.4 Flux complet d’une consultation des inscriptions

```text
1. Frontend appelle GET /api/enrollments/me?cnie=...
2. Gateway route vers Enrollment Service
3. Enrollment Service retrouve l’étudiant
4. Il charge ses inscriptions
5. Il complète chaque inscription avec le titre du cours
6. Il renvoie la liste au front
```

---

# 13. Questions de soutenance : banque technique

## 13.1 Architecture générale

**Pourquoi le projet est-il découpé en microservices ?**  
Pour séparer les responsabilités, faciliter la maintenance et rendre chaque domaine métier indépendant.

**Quels sont les avantages du Gateway ?**  
Centralisation, CORS simplifié, point d’entrée unique, possibilité de future sécurité globale.

**Pourquoi utiliser Eureka au lieu d’URL fixes ?**  
Parce qu’Eureka permet la découverte dynamique des services.

---

## 13.2 Microservice Student

**Pourquoi valider le CNIE et l’email ?**  
Pour garantir l’intégrité des données.

**Pourquoi utiliser un handler global ?**  
Pour renvoyer des erreurs propres et homogènes.

**Pourquoi normaliser le CNIE en majuscules ?**  
Pour éviter les doublons dus à la casse.

---

## 13.3 Microservice Course

**Pourquoi les cours ont-ils une description et des crédits ?**  
Parce qu’ils représentent un vrai objet pédagogique, pas seulement un identifiant.

**Pourquoi les validations sont faites sur l’entité ?**  
Parce que cela permet de bloquer les données invalides dès l’entrée.

---

## 13.4 Microservice Enrollment

**Pourquoi l’inscription est-elle un microservice séparé ?**  
Parce qu’elle représente une relation métier complexe avec ses propres règles.

**Pourquoi utiliser `WebClient` ?**  
Pour consulter d’autres services et construire une vue cohérente.

**Pourquoi un DTO de réponse ?**  
Pour envoyer une réponse adaptée au front, pas une entité brute.

**Pourquoi une fenêtre de 24h pour annuler ?**  
C’est une règle métier codée dans `isDeletable()`.

**Pourquoi la capacité est-elle limitée à 3 ?**  
Pour illustrer une contrainte métier simple et démontrer la logique de contrôle.

---

## 13.5 Frontend

**Pourquoi le front ne parle qu’au Gateway ?**  
Parce que cela protège l’architecture et simplifie l’URL publique.

**Pourquoi utiliser `localStorage` ?**  
Pour conserver le CNIE entre deux visites.

**Pourquoi un dashboard statique plutôt qu’un framework SPA ?**  
Pour rester simple, lisible et facile à présenter.

---

# 14. Résumé final de révision

## 14.1 Ce qu’il faut absolument retenir

- Le projet suit une vraie logique microservices.
- Eureka gère la découverte des services.
- Le Gateway centralise les accès.
- Student, Course et Enrollment ont des responsabilités séparées.
- Enrollment Service est le cœur métier.
- Le front consomme uniquement le Gateway.
- Les DTO et les handlers d’exceptions rendent les échanges propres.
- Les bases de données sont séparées par domaine.

## 14.2 Réponse courte pour l’oral

Ce projet est un système d’inscription universitaire développé avec Spring Boot en architecture microservices. Le Discovery Server permet aux services de se découvrir, le Gateway centralise les requêtes, le Student Service gère les étudiants, le Course Service gère les cours, et le Enrollment Service applique la logique d’inscription, de capacité et d’annulation. Le front-end statique consomme uniquement le Gateway et présente les données de manière interactive.

---

# 15. Annexe : schéma ASCII de synthèse

```text
                +------------------------+
                |  Discovery Server      |
                |  Eureka :8761          |
                +-----------+------------+
                            ^
                            |
        +-------------------+-------------------+
        |                   |                   |
        v                   v                   v
+---------------+   +---------------+   +------------------+
| Student Service|   | Course Service|   | Enrollment Service|
| :8081         |   | :8082         |   | :8083             |
| student_db    |   | course_db     |   | enrollment_db     |
+-------+-------+   +-------+-------+   +---------+--------+
        ^                   ^                     ^
        |                   |                     |
        +---------+---------+---------+-----------+
                  |                   |
                  v                   v
            +-------------------------------+
            |          API Gateway          |
            |           :8080               |
            +---------------+---------------+
                            |
                            v
                 +----------------------+
                 | Dashboard Frontend   |
                 | HTML/CSS/JS          |
                 +----------------------+
```
