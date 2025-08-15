package br.com.sualistapessoal.gerenciador_tarefas.push;

import br.com.sualistapessoal.gerenciador_tarefas.Task;
import br.com.sualistapessoal.gerenciador_tarefas.TaskRepository;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.jose4j.lang.JoseException;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.ExecutionException;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;


@Service
@EnableScheduling
public class NotificationService {

    private final TaskRepository taskRepository;
    private final PushSubscriptionRepository subscriptionRepository;
    private final PushService pushService;
    private final ObjectMapper objectMapper;


    public NotificationService(TaskRepository taskRepository, PushSubscriptionRepository subscriptionRepository, PushService pushService, ObjectMapper objectMapper) {
        this.taskRepository = taskRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.pushService = pushService;
        this.objectMapper = objectMapper;
    }


    @Scheduled(fixedRate = 60000) // Executa a cada 60 segundos
    public void checkAndSendNotifications() {
        LocalDateTime now = LocalDateTime.now();
        List<Task> tasks = taskRepository.findAll();

        for (Task task : tasks) {
            if (task.isCompleted() || !task.isWithNotification() || task.getDate() == null || task.getTime() == null) {
                continue;
            }

            LocalDateTime taskDateTime = LocalDateTime.of(task.getDate(), task.getTime());
            String notificationPayload = createNotificationPayload(task);

            // Lembrete 5 minutos antes
            if (task.getNotificationState() < 1 && taskDateTime.isAfter(now) && taskDateTime.minusMinutes(5).isBefore(now)) {
                sendNotificationToUser(task, notificationPayload);
                task.setNotificationState(1);
                taskRepository.save(task);
            }
            // Lembrete na hora exata
            else if (task.getNotificationState() < 2 && (taskDateTime.isBefore(now) || taskDateTime.isEqual(now)) && taskDateTime.plusMinutes(1).isAfter(now)) {
                sendNotificationToUser(task, notificationPayload);
                task.setNotificationState(2);
                taskRepository.save(task);
            }
        }
    }

    private String createNotificationPayload(Task task) {
        try {
            Map<String, String> payload = Map.of(
                    "title", "Lembrete: " + task.getTitle(),
                    "body", "Sua tarefa está agendada para agora. Não se esqueça!",
                    "icon", "/icons/icon-192x192.png"
            );
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            // Lidar com o erro de serialização
            return "{}";
        }
    }

    private void sendNotificationToUser(Task task, String payload) {
        List<PushSubscription> subscriptions = subscriptionRepository.findByUserId(task.getUser().getId());
        for (PushSubscription sub : subscriptions) {
            try {
                Notification webPushNotification = new Notification(
                        sub.getEndpoint(),
                        sub.getP256dh(),
                        sub.getAuth(),
                        payload
                );
                pushService.send(webPushNotification);
            } catch (GeneralSecurityException | IOException | JoseException | ExecutionException | InterruptedException e) {
                e.printStackTrace();
            }
        }
    }
}