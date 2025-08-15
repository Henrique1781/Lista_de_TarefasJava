package br.com.sualistapessoal.gerenciador_tarefas.push;

import br.com.sualistapessoal.gerenciador_tarefas.User;
import br.com.sualistapessoal.gerenciador_tarefas.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    @Value("${vapid.public.key}")
    private String vapidPublicKey;

    @Autowired
    private PushSubscriptionRepository subscriptionRepository;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/vapidPublicKey")
    public ResponseEntity<Map<String, String>> getVapidPublicKey() {
        return ResponseEntity.ok(Map.of("publicKey", vapidPublicKey));
    }

    @PostMapping("/subscribe")
    public ResponseEntity<?> subscribe(@RequestBody Map<String, String> subscriptionData, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Usuário não encontrado."));

        PushSubscription subscription = new PushSubscription();
        subscription.setEndpoint(subscriptionData.get("endpoint"));
        subscription.setP256dh(subscriptionData.get("p256dh"));
        subscription.setAuth(subscriptionData.get("auth"));
        subscription.setUser(user);

        subscriptionRepository.save(subscription);
        return new ResponseEntity<>(HttpStatus.CREATED);
    }
}